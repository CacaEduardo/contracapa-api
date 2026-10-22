import type { BookSummary } from 'src/modules/books/book-response';
import type { Editoria } from 'src/modules/books/editorias';
import type { EpisodeSummary } from 'src/modules/episodes/episode-response';
import type { PublicExpert } from 'src/modules/experts/expert-response';
import type { RecommendationDocument } from 'src/modules/recommendations/schemas/recommendation.schema';

export type RecommendationResponse = {
  _id: string;
  editoria: Editoria;
  episodeId: string;
  episode: EpisodeSummary | null;
  expertId: string;
  expert: PublicExpert | null;
  bookId: string;
  book: BookSummary | null;
  createdAt?: Date;
};

export type RecommendationRelations = {
  episodes: Map<string, EpisodeSummary>;
  experts: Map<string, PublicExpert>;
  books: Map<string, BookSummary>;
};

export function toRecommendationResponse(
  recommendation: RecommendationDocument,
  { episodes, experts, books }: RecommendationRelations,
): RecommendationResponse {
  return {
    _id: recommendation._id.toString(),
    editoria: recommendation.editoria,
    episodeId: recommendation.episodeId,
    episode: episodes.get(recommendation.episodeId) ?? null,
    expertId: recommendation.expertId,
    expert: experts.get(recommendation.expertId) ?? null,
    bookId: recommendation.bookId,
    book: books.get(recommendation.bookId) ?? null,
    createdAt: recommendation.createdAt,
  };
}
