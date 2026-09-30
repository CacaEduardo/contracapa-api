import { z } from 'zod';
import { createWishlistSchema } from 'src/modules/wishlists/dto/create-wishlist.dto';

export const updateWishlistSchema = createWishlistSchema.partial();

export type UpdateWishlistDto = z.infer<typeof updateWishlistSchema>;
