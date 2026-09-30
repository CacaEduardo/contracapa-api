import type { BookResponse } from 'src/modules/books/book-response';
import type { WishlistDocument } from 'src/modules/wishlists/schemas/wishlist.schema';

export type WishlistPreviewBook = Pick<
  BookResponse,
  '_id' | 'title' | 'author' | 'coverSrc'
>;

export type WishlistSummary = {
  _id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  bookCount: number;
  previewBooks: WishlistPreviewBook[];
  updatedAt?: Date;
};

export type WishlistItemResponse = {
  book: BookResponse;
  addedAt: Date;
};

export type WishlistDetail = WishlistSummary & {
  items: WishlistItemResponse[];
};

export function toWishlistSummary(
  wishlist: WishlistDocument,
  previewBooks: WishlistPreviewBook[],
): WishlistSummary {
  return {
    _id: wishlist._id.toString(),
    name: wishlist.name,
    description: wishlist.description ?? null,
    isDefault: wishlist.isDefault,
    bookCount: wishlist.items.length,
    previewBooks,
    updatedAt: wishlist.updatedAt,
  };
}
