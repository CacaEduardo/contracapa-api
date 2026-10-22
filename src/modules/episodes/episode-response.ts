import type { PublicExpert } from 'src/modules/experts/expert-response';
import type { EpisodeDocument } from 'src/modules/episodes/schemas/episode.schema';

export type EpisodeSummary = {
  _id: string;
  videoId: string;
  youtubeUrl: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: Date;
};

export type EpisodeResponse = EpisodeSummary & {
  expertIds: string[];
  experts: PublicExpert[];
  recommendationCount: number;
};

// Pré-preenchimento do formulário a partir do link (oEmbed pode falhar: título e canal vazios).
export type EpisodeLookupResponse = {
  videoId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  title: string | null;
  channelName: string | null;
  alreadyRegisteredId: string | null;
};

export type ListEpisodesResult = {
  items: EpisodeResponse[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export function toEpisodeSummary(episode: EpisodeDocument): EpisodeSummary {
  return {
    _id: episode._id.toString(),
    videoId: episode.videoId,
    youtubeUrl: episode.youtubeUrl,
    title: episode.title,
    channelName: episode.channelName,
    thumbnailUrl: episode.thumbnailUrl,
    publishedAt: episode.publishedAt,
  };
}

export function toEpisodeResponse(
  episode: EpisodeDocument,
  expertsById: Map<string, PublicExpert>,
): EpisodeResponse {
  return {
    ...toEpisodeSummary(episode),
    expertIds: episode.expertIds,
    experts: episode.expertIds
      .map((id) => expertsById.get(id))
      .filter((expert): expert is PublicExpert => expert !== undefined),
    recommendationCount: episode.recommendationCount,
  };
}
