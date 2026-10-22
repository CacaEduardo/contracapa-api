import { z } from 'zod';
import { toArray } from 'src/common/lib/to-array';

export const listReviewsQuerySchema = z.object({
  experts: z.preprocess(toArray, z.array(z.string()).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(10),
});

export type ListReviewsQueryDto = z.infer<typeof listReviewsQuerySchema>;
