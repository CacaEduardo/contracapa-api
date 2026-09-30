import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido')),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
