import type {
  BookDocument,
  BookVerdict,
} from 'src/modules/books/schemas/book.schema';

export type BookCategorySummary = {
  slug: string;
  name: string;
};

export type BookResponse = {
  _id: string;
  slug: string;
  title: string;
  author: string;
  year: number;
  pages: number;
  coverSrc: string | null;
  amazonUrl: string | null;
  categorySlugs: string[];
  categories: BookCategorySummary[];
  reviewId: string | null;
  verdict: BookVerdict | null;
  weekly: boolean;
  reviewPublishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toBookResponse(
  book: BookDocument,
  categoryNamesBySlug: Map<string, string>,
): BookResponse {
  return {
    _id: book._id.toString(),
    slug: book.slug,
    title: book.title,
    author: book.author,
    year: book.year,
    pages: book.pages,
    coverSrc: book.coverSrc,
    amazonUrl: book.amazonUrl,
    categorySlugs: book.categorySlugs,
    categories: book.categorySlugs
      .filter((slug) => categoryNamesBySlug.has(slug))
      .map((slug) => ({ slug, name: categoryNamesBySlug.get(slug)! })),
    reviewId: book.reviewId,
    verdict: book.reviewVerdict,
    weekly: book.reviewWeekly,
    reviewPublishedAt: book.reviewPublishedAt,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}
