import { z } from 'zod';
import { createRecommendationSchema } from 'src/modules/recommendations/dto/create-recommendation.dto';

// Especialista é fixo: para trocar, exclua e crie outra recomendação.
export const updateRecommendationSchema = createRecommendationSchema
  .omit({ expertId: true })
  .partial();

export type UpdateRecommendationDto = z.infer<
  typeof updateRecommendationSchema
>;
