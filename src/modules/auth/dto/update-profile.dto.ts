import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
