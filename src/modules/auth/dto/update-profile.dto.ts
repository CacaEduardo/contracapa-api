import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  company: z.string().trim().max(120).optional(),
  favoriteCategorySlugs: z.array(z.string().min(1)).optional(),
  onboardingCompleted: z.literal(true).optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
