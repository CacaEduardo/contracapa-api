import type { Editoria } from 'src/modules/books/editorias';
import type { BookResponse } from 'src/modules/books/book-response';
import type { PublicExpert } from 'src/modules/experts/expert-response';
import type {
  ReviewDocument,
  ReviewPodcastLinks,
} from 'src/modules/reviews/schemas/review.schema';

export type IndicatedBook = Pick<
  BookResponse,
  '_id' | 'slug' | 'title' | 'author' | 'coverSrc' | 'active'
>;

export type ReviewIndicationResponse = {
  editoria: Editoria;
  bookId: string;
  book: IndicatedBook | null;
};

export type ReviewResponse = {
  _id: string;
  slug: string;
  expertId: string;
  expert: PublicExpert | null;
  editorialTitle: string;
  excerpt: string;
  content: string;
  indications: ReviewIndicationResponse[];
  publishedAt: Date;
  weekly: boolean;
  podcast: ReviewPodcastLinks;
};

export type ReviewSummary = Pick<
  ReviewResponse,
  '_id' | 'slug' | 'editorialTitle' | 'publishedAt' | 'podcast'
>;

// Uma indicação do livro vista a partir da página do livro.
export type BookIndicationResponse = {
  editoria: Editoria;
  review: ReviewSummary;
  expert: PublicExpert | null;
};

export type ListReviewsResult = {
  items: ReviewResponse[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export function toIndicatedBook(book: BookResponse): IndicatedBook {
  const { _id, slug, title, author, coverSrc, active } = book;
  return { _id, slug, title, author, coverSrc, active };
}

export function toReviewSummary(review: ReviewDocument): ReviewSummary {
  return {
    _id: review._id.toString(),
    slug: review.slug,
    editorialTitle: review.editorialTitle,
    publishedAt: review.publishedAt,
    podcast: review.podcast,
  };
}

export function toReviewResponse(
  review: ReviewDocument,
  expertsById: Map<string, PublicExpert>,
  booksById: Map<string, IndicatedBook>,
): ReviewResponse {
  return {
    ...toReviewSummary(review),
    expertId: review.expertId,
    expert: expertsById.get(review.expertId) ?? null,
    excerpt: review.excerpt,
    content: review.content,
    indications: review.indications.map(({ editoria, bookId }) => ({
      editoria,
      bookId,
      book: booksById.get(bookId) ?? null,
    })),
    weekly: review.weekly,
  };
}
