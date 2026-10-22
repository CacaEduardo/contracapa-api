import type { Editoria } from 'src/modules/books/editorias';
import type { BookDocument } from 'src/modules/books/schemas/book.schema';

export type BookCategorySummary = {
  slug: string;
  name: string;
};

export type BookResponse = {
  _id: string;
  slug: string;
  title: string;
  author: string;
  description: string | null;
  year: number;
  pages: number;
  coverSrc: string | null;
  amazonUrl: string | null;
  categorySlugs: string[];
  categories: BookCategorySummary[];
  active: boolean;
  editorias: Editoria[];
  recommendationCount: number;
  disrecommendationCount: number;
  reviewCount: number;
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
    description: book.description,
    year: book.year,
    pages: book.pages,
    coverSrc: book.coverSrc,
    amazonUrl: book.amazonUrl,
    categorySlugs: book.categorySlugs,
    categories: book.categorySlugs
      .filter((slug) => categoryNamesBySlug.has(slug))
      .map((slug) => ({ slug, name: categoryNamesBySlug.get(slug)! })),
    active: book.active,
    editorias: book.editorias,
    recommendationCount: book.recommendationCount,
    disrecommendationCount: book.disrecommendationCount,
    reviewCount: book.reviewCount,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

// Livro citado por resenhas e recomendações; `active` permite ao leitor esconder o link.
export type BookSummary = Pick<
  BookResponse,
  '_id' | 'slug' | 'title' | 'author' | 'coverSrc' | 'active'
>;

export function toBookSummary(book: BookResponse): BookSummary {
  const { _id, slug, title, author, coverSrc, active } = book;
  return { _id, slug, title, author, coverSrc, active };
}
