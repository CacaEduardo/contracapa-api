import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { escapeRegExp } from 'src/common/lib/escape-regexp';
import type { CreateEpisodeDto } from 'src/modules/episodes/dto/create-episode.dto';
import type { ListEpisodesQueryDto } from 'src/modules/episodes/dto/list-episodes-query.dto';
import type { UpdateEpisodeDto } from 'src/modules/episodes/dto/update-episode.dto';
import {
  toEpisodeResponse,
  toEpisodeSummary,
  type EpisodeLookupResponse,
  type EpisodeResponse,
  type EpisodeSummary,
  type ListEpisodesResult,
} from 'src/modules/episodes/episode-response';
import {
  Episode,
  type EpisodeDocument,
} from 'src/modules/episodes/schemas/episode.schema';
import {
  parseYoutubeVideoId,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from 'src/modules/episodes/youtube';
import { YoutubeOembedService } from 'src/modules/episodes/youtube-oembed.service';
import type { PublicExpert } from 'src/modules/experts/expert-response';
import { ExpertsService } from 'src/modules/experts/experts.service';

const NOT_FOUND_MESSAGE = 'Episódio não encontrado';
const DUPLICATE_MESSAGE = 'Este episódio já está cadastrado';
const IN_USE_MESSAGE =
  'Este episódio tem recomendações. Remova-as antes de excluí-lo.';
const RECOMMENDER_REMOVED_MESSAGE =
  'Não é possível tirar do episódio um especialista que tem recomendações nele.';

export type EpisodeRecommendationSnapshot = {
  recommendationCount: number;
  recommenderIds: string[];
};

const unique = (values: string[]) => [...new Set(values)];

@Injectable()
export class EpisodesService {
  private readonly logger = new Logger(EpisodesService.name);

  constructor(
    @InjectModel(Episode.name)
    private readonly episodeModel: Model<EpisodeDocument>,
    private readonly expertsService: ExpertsService,
    private readonly youtubeOembedService: YoutubeOembedService,
  ) {}

  async lookup(youtubeUrl: string): Promise<EpisodeLookupResponse> {
    // O DTO já validou o link.
    const videoId = parseYoutubeVideoId(youtubeUrl)!;
    const [oembed, existing] = await Promise.all([
      this.youtubeOembedService.fetch(videoId),
      this.episodeModel.findOne({ videoId }).exec(),
    ]);

    return {
      videoId,
      youtubeUrl: youtubeWatchUrl(videoId),
      thumbnailUrl: youtubeThumbnailUrl(videoId),
      title: oembed?.title ?? null,
      channelName: oembed?.channelName ?? null,
      alreadyRegisteredId: existing?._id.toString() ?? null,
    };
  }

  async create(dto: CreateEpisodeDto): Promise<EpisodeResponse> {
    const videoId = parseYoutubeVideoId(dto.youtubeUrl)!;
    await this.assertVideoAvailable(videoId);
    await this.assertExpertsExist(dto.expertIds);

    const created = await this.episodeModel.create({
      videoId,
      youtubeUrl: youtubeWatchUrl(videoId),
      thumbnailUrl: youtubeThumbnailUrl(videoId),
      title: dto.title,
      channelName: dto.channelName,
      publishedAt: dto.publishedAt,
      expertIds: dto.expertIds,
    });

    await this.syncExpertCounts(dto.expertIds);

    return this.toResponse(created, false);
  }

  // Leitura pública: especialistas inativos saem da lista de convidados.
  async findAll(query: ListEpisodesQueryDto): Promise<ListEpisodesResult> {
    return this.list(query, true);
  }

  async findAllAdmin(query: ListEpisodesQueryDto): Promise<ListEpisodesResult> {
    return this.list(query, false);
  }

  async findOne(id: string): Promise<EpisodeResponse> {
    return this.toResponse(await this.findById(id), true);
  }

  async findOneAdmin(id: string): Promise<EpisodeResponse> {
    return this.toResponse(await this.findById(id), false);
  }

  async findById(id: string): Promise<EpisodeDocument> {
    const episode = await this.episodeModel.findById(id).exec();

    if (!episode) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return episode;
  }

  async findSummariesByIds(ids: string[]): Promise<EpisodeSummary[]> {
    const validIds = unique(ids).filter((id) => isValidObjectId(id));

    if (validIds.length === 0) {
      return [];
    }

    const episodes = await this.episodeModel
      .find({ _id: { $in: validIds } })
      .exec();

    return episodes.map(toEpisodeSummary);
  }

  async update(id: string, dto: UpdateEpisodeDto): Promise<EpisodeResponse> {
    const episode = await this.findById(id);
    const videoId =
      dto.youtubeUrl !== undefined
        ? parseYoutubeVideoId(dto.youtubeUrl)!
        : episode.videoId;

    if (videoId !== episode.videoId) {
      await this.assertVideoAvailable(videoId);
    }

    if (dto.expertIds !== undefined) {
      await this.assertExpertsExist(dto.expertIds);

      if (
        episode.recommenderIds.some(
          (expertId) => !dto.expertIds!.includes(expertId),
        )
      ) {
        throw new ConflictException(RECOMMENDER_REMOVED_MESSAGE);
      }
    }

    const payload: Partial<Episode> = {
      ...(dto.youtubeUrl !== undefined && {
        videoId,
        youtubeUrl: youtubeWatchUrl(videoId),
        thumbnailUrl: youtubeThumbnailUrl(videoId),
      }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.channelName !== undefined && { channelName: dto.channelName }),
      ...(dto.publishedAt !== undefined && { publishedAt: dto.publishedAt }),
      ...(dto.expertIds !== undefined && { expertIds: dto.expertIds }),
    };

    const updated = await this.episodeModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    await this.syncExpertCounts([...episode.expertIds, ...updated.expertIds]);

    return this.toResponse(updated, false);
  }

  async remove(id: string): Promise<void> {
    const episode = await this.findById(id);

    if (episode.recommendationCount > 0) {
      throw new ConflictException(IN_USE_MESSAGE);
    }

    await this.episodeModel.findByIdAndDelete(id).exec();
    await this.syncExpertCounts(episode.expertIds);
  }

  async setRecommendationSnapshot(
    id: string,
    snapshot: EpisodeRecommendationSnapshot,
  ): Promise<void> {
    try {
      await this.episodeModel.findByIdAndUpdate(id, snapshot).exec();
    } catch (error) {
      this.logger.warn(
        `Falha ao sincronizar recomendações do episódio: episodeId=${id} ${String(error)}`,
      );
    }
  }

  async count(): Promise<number> {
    return this.episodeModel.countDocuments().exec();
  }

  private async list(
    query: ListEpisodesQueryDto,
    activeExpertsOnly: boolean,
  ): Promise<ListEpisodesResult> {
    const filter: Record<string, unknown> = {};

    if (query.q) {
      const regex = new RegExp(escapeRegExp(query.q), 'i');
      filter.$or = [{ title: regex }, { channelName: regex }];
    }

    if (query.experts?.length) {
      const experts = await this.expertsService.findBySlugs(query.experts);
      filter.expertIds = {
        $in: experts.map((expert) => expert._id.toString()),
      };
    }

    const total = await this.episodeModel.countDocuments(filter).exec();
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    const episodes = await this.episodeModel
      .find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .exec();

    return {
      items: await this.toResponseList(episodes, activeExpertsOnly),
      total,
      totalPages,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private async assertVideoAvailable(videoId: string): Promise<void> {
    if (await this.episodeModel.exists({ videoId }).exec()) {
      throw new ConflictException(DUPLICATE_MESSAGE);
    }
  }

  private async assertExpertsExist(expertIds: string[]): Promise<void> {
    const experts = await this.expertsService.findByIds(expertIds);

    if (experts.length !== expertIds.length) {
      throw new NotFoundException('Especialista não encontrado');
    }
  }

  private async syncExpertCounts(expertIds: string[]): Promise<void> {
    await Promise.all(
      unique(expertIds).map(async (expertId) =>
        this.expertsService.setCounter(
          expertId,
          'episodeCount',
          await this.episodeModel
            .countDocuments({ expertIds: expertId })
            .exec(),
        ),
      ),
    );
  }

  private async toResponse(
    episode: EpisodeDocument,
    activeExpertsOnly: boolean,
  ): Promise<EpisodeResponse> {
    const [response] = await this.toResponseList([episode], activeExpertsOnly);
    return response;
  }

  private async toResponseList(
    episodes: EpisodeDocument[],
    activeExpertsOnly: boolean,
  ): Promise<EpisodeResponse[]> {
    const experts = await this.expertsService.findByIds(
      unique(episodes.flatMap(({ expertIds }) => expertIds)),
    );
    const expertsById = new Map<string, PublicExpert>(
      experts
        .filter((expert) => !activeExpertsOnly || expert.active)
        .map((expert) => [expert._id, expert]),
    );

    return episodes.map((episode) => toEpisodeResponse(episode, expertsById));
  }
}
