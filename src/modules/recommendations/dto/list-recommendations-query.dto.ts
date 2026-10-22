import { z } from 'zod';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';
import { toArray } from 'src/common/lib/to-array';

export const listRecommendationsQuerySchema = z
  .object({
    experts: z.preprocess(toArray, z.array(z.string()).optional()),
    episodes: z.preprocess(toArray, z.array(mongoIdSchema).optional()),
    book: mongoIdSchema.optional(),
  })
  .refine(
    (query) =>
      Boolean(query.experts?.length || query.episodes?.length || query.book),
    'Filtre por especialista, episódio ou livro',
  );

export type ListRecommendationsQueryDto = z.infer<
  typeof listRecommendationsQuerySchema
>;
