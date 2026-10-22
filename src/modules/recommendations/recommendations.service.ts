import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { toBookSummary } from 'src/modules/books/book-response';
import { BooksService } from 'src/modules/books/books.service';
import { EDITORIAS, isRecommendation } from 'src/modules/books/editorias';
import type { BookRecommendedAt } from 'src/modules/books/schemas/book.schema';
import { EpisodesService } from 'src/modules/episodes/episodes.service';
import { ExpertsService } from 'src/modules/experts/experts.service';
import type { CreateRecommendationDto } from 'src/modules/recommendations/dto/create-recommendation.dto';
import type { ListRecommendationsQueryDto } from 'src/modules/recommendations/dto/list-recommendations-query.dto';
import type { UpdateRecommendationDto } from 'src/modules/recommendations/dto/update-recommendation.dto';
import {
  toRecommendationResponse,
  type RecommendationResponse,
} from 'src/modules/recommendations/recommendation-response';
import {
  Recommendation,
  type RecommendationDocument,
} from 'src/modules/recommendations/schemas/recommendation.schema';

const NOT_FOUND_MESSAGE = 'Recomendação não encontrada';
const DUPLICATE_MESSAGE =
  'Este especialista já recomendou este livro neste episódio';
const NOT_A_GUEST_MESSAGE = 'Este especialista não participou do episódio';

type RecommendationTarget = Pick<
  Recommendation,
  'episodeId' | 'expertId' | 'bookId'
>;

const unique = (values: string[]) => [...new Set(values)];

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectModel(Recommendation.name)
    private readonly recommendationModel: Model<RecommendationDocument>,
    private readonly booksService: BooksService,
    private readonly expertsService: ExpertsService,
    private readonly episodesService: EpisodesService,
  ) {}

  async create(dto: CreateRecommendationDto): Promise<RecommendationResponse> {
    await this.assertValidTarget(dto);

    const created = await this.recommendationModel.create(dto);
    await this.syncSnapshots([created]);

    return this.toResponse(created);
  }

  async findAll(
    query: ListRecommendationsQueryDto,
  ): Promise<RecommendationResponse[]> {
    const filter: Record<string, unknown> = {};

    if (query.experts?.length) {
      const experts = await this.expertsService.findBySlugs(query.experts);
      filter.expertId = { $in: experts.map((expert) => expert._id.toString()) };
    }

    if (query.episodes?.length) {
      filter.episodeId = { $in: query.episodes };
    }

    if (query.book) {
      filter.bookId = query.book;
    }

    const recommendations = await this.recommendationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return this.toResponseList(recommendations);
  }

  async findOne(id: string): Promise<RecommendationResponse> {
    return this.toResponse(await this.findDocument(id));
  }

  async update(
    id: string,
    dto: UpdateRecommendationDto,
  ): Promise<RecommendationResponse> {
    const recommendation = await this.findDocument(id);
    const target: RecommendationTarget = {
      episodeId: dto.episodeId ?? recommendation.episodeId,
      expertId: recommendation.expertId,
      bookId: dto.bookId ?? recommendation.bookId,
    };

    if (
      target.episodeId !== recommendation.episodeId ||
      target.bookId !== recommendation.bookId
    ) {
      await this.assertValidTarget(target);
    }

    const updated = await this.recommendationModel
      .findByIdAndUpdate(
        id,
        { ...target, ...(dto.editoria && { editoria: dto.editoria }) },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    await this.syncSnapshots([recommendation, updated]);

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const recommendation = await this.findDocument(id);

    await this.recommendationModel.findByIdAndDelete(id).exec();
    await this.syncSnapshots([recommendation]);
  }

  async count(): Promise<number> {
    return this.recommendationModel.countDocuments().exec();
  }

  private async findDocument(id: string): Promise<RecommendationDocument> {
    const recommendation = await this.recommendationModel.findById(id).exec();

    if (!recommendation) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return recommendation;
  }

  private async assertValidTarget({
    episodeId,
    expertId,
    bookId,
  }: RecommendationTarget): Promise<void> {
    const episode = await this.episodesService.findById(episodeId);

    if (!episode.expertIds.includes(expertId)) {
      throw new BadRequestException(NOT_A_GUEST_MESSAGE);
    }

    await this.booksService.findById(bookId);

    if (
      await this.recommendationModel
        .exists({ episodeId, expertId, bookId })
        .exec()
    ) {
      throw new ConflictException(DUPLICATE_MESSAGE);
    }
  }

  // Recalcula os snapshots desnormalizados em livros, especialistas e episódios afetados.
  private async syncSnapshots(
    recommendations: RecommendationTarget[],
  ): Promise<void> {
    await Promise.all([
      ...unique(recommendations.map(({ bookId }) => bookId)).map((bookId) =>
        this.syncBookSnapshot(bookId),
      ),
      ...unique(recommendations.map(({ expertId }) => expertId)).map(
        async (expertId) =>
          this.expertsService.setCounter(
            expertId,
            'recommendationCount',
            await this.recommendationModel.countDocuments({ expertId }).exec(),
          ),
      ),
      ...unique(recommendations.map(({ episodeId }) => episodeId)).map(
        (episodeId) => this.syncEpisodeSnapshot(episodeId),
      ),
    ]);
  }

  private async syncBookSnapshot(bookId: string): Promise<void> {
    const recommendations = await this.recommendationModel
      .find({ bookId })
      .exec();
    const experts = await this.expertsService.findByIds(
      unique(recommendations.map(({ expertId }) => expertId)),
    );
    const recommendationCount = recommendations.filter(({ editoria }) =>
      isRecommendation(editoria),
    ).length;

    await this.booksService.setRecommendationSnapshot(bookId, {
      editorias: EDITORIAS.filter((editoria) =>
        recommendations.some((item) => item.editoria === editoria),
      ),
      recommenderSlugs: experts.map(({ slug }) => slug),
      recommendationCount,
      disrecommendationCount: recommendations.length - recommendationCount,
      recommendedAt: latestByEditoria(recommendations),
    });
  }

  private async syncEpisodeSnapshot(episodeId: string): Promise<void> {
    const recommendations = await this.recommendationModel
      .find({ episodeId })
      .exec();

    await this.episodesService.setRecommendationSnapshot(episodeId, {
      recommendationCount: recommendations.length,
      recommenderIds: unique(recommendations.map(({ expertId }) => expertId)),
    });
  }

  private async toResponse(
    recommendation: RecommendationDocument,
  ): Promise<RecommendationResponse> {
    const [response] = await this.toResponseList([recommendation]);
    return response;
  }

  private async toResponseList(
    recommendations: RecommendationDocument[],
  ): Promise<RecommendationResponse[]> {
    const [episodes, experts, books] = await Promise.all([
      this.episodesService.findSummariesByIds(
        recommendations.map(({ episodeId }) => episodeId),
      ),
      this.expertsService.findByIds(
        unique(recommendations.map(({ expertId }) => expertId)),
      ),
      this.booksService.findByIds(
        unique(recommendations.map(({ bookId }) => bookId)),
      ),
    ]);
    const relations = {
      episodes: new Map(episodes.map((episode) => [episode._id, episode])),
      experts: new Map(experts.map((expert) => [expert._id, expert])),
      books: new Map(books.map((book) => [book._id, toBookSummary(book)])),
    };

    return recommendations.map((recommendation) =>
      toRecommendationResponse(recommendation, relations),
    );
  }
}

function latestByEditoria(
  recommendations: Pick<Recommendation, 'editoria' | 'createdAt'>[],
): BookRecommendedAt {
  const latest: BookRecommendedAt = {};

  for (const { editoria, createdAt } of recommendations) {
    const current = latest[editoria];

    if (createdAt && (!current || createdAt > current)) {
      latest[editoria] = createdAt;
    }
  }

  return latest;
}
