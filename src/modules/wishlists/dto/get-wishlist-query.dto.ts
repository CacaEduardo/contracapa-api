import { z } from 'zod';

export const getWishlistQuerySchema = z.object({
  sort: z.enum(['recent', 'az']).default('recent'),
});

export type GetWishlistQueryDto = z.infer<typeof getWishlistQuerySchema>;
export type WishlistSort = GetWishlistQueryDto['sort'];
