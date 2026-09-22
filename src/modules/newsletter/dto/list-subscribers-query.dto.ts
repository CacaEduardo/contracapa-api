import { z } from 'zod';

export const listSubscribersQuerySchema = z.object({
  q: z.string().trim().optional(),
});

export type ListSubscribersQueryDto = z.infer<
  typeof listSubscribersQuerySchema
>;
