import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da categoria'),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
