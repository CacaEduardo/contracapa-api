import { z } from 'zod';

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  newPassword: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
