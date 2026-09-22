import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  active: z.coerce.boolean().optional(),
});

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
