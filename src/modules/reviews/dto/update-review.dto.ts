import { z } from 'zod';
import { createReviewSchema } from 'src/modules/reviews/dto/create-review.dto';

export const updateReviewSchema = createReviewSchema
  .omit({ bookId: true })
  .partial();

export type UpdateReviewDto = z.infer<typeof updateReviewSchema>;
