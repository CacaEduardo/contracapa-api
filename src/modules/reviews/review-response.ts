import type { BookSummary } from 'src/modules/books/book-response';
import type { PublicExpert } from 'src/modules/experts/expert-response';
import type { ReviewDocument } from 'src/modules/reviews/schemas/review.schema';

export type ReviewResponse = {
  _id: string;
  slug: string;
  expertId: string;
  expert: PublicExpert | null;
  bookId: string;
  book: BookSummary | null;
  editorialTitle: string;
  excerpt: string;
  content: string;
  publishedAt: Date;
  weekly: boolean;
};

export type ListReviewsResult = {
  items: ReviewResponse[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export function toReviewResponse(
  review: ReviewDocument,
  expertsById: Map<string, PublicExpert>,
  booksById: Map<string, BookSummary>,
): ReviewResponse {
  return {
    _id: review._id.toString(),
    slug: review.slug,
    expertId: review.expertId,
    expert: expertsById.get(review.expertId) ?? null,
    bookId: review.bookId,
    book: booksById.get(review.bookId) ?? null,
    editorialTitle: review.editorialTitle,
    excerpt: review.excerpt,
    content: review.content,
    publishedAt: review.publishedAt,
    weekly: review.weekly,
  };
}
