import { z } from 'zod';

export const listReviewsQuerySchema = z.object({
  expert: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(10),
});

export type ListReviewsQueryDto = z.infer<typeof listReviewsQuerySchema>;
