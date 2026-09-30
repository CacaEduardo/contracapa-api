import { z } from 'zod';
import { createExpertSchema } from 'src/modules/experts/dto/create-expert.dto';

export const updateExpertSchema = createExpertSchema.partial();

export type UpdateExpertDto = z.infer<typeof updateExpertSchema>;
