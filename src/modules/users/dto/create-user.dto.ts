import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6).optional(),
  avatarUrl: z.url().optional(),
  role: z.enum(['admin', 'user']).optional(),
  phone: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
