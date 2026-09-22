import { z } from 'zod';
import { createCategorySchema } from 'src/modules/categories/dto/create-category.dto';

export const updateCategorySchema = createCategorySchema.partial();

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
