import { z } from 'zod';
import { createExpertSchema } from 'src/modules/experts/dto/create-expert.dto';

export const updateExpertSchema = createExpertSchema
  .extend({ active: z.boolean() })
  .partial();

export type UpdateExpertDto = z.infer<typeof updateExpertSchema>;
