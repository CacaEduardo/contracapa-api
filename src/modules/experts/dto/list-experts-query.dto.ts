import { z } from 'zod';

export const listExpertsQuerySchema = z.object({
  q: z.string().trim().optional(),
});

export type ListExpertsQueryDto = z.infer<typeof listExpertsQuerySchema>;
