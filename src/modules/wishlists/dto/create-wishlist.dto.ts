import { z } from 'zod';

export const createWishlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da lista')
    .max(60, 'Use no máximo 60 caracteres'),
  description: z
    .string()
    .trim()
    .max(280, 'Use no máximo 280 caracteres')
    .optional(),
});

export type CreateWishlistDto = z.infer<typeof createWishlistSchema>;
