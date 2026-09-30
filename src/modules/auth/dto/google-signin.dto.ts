import { z } from 'zod';

export const googleSignInSchema = z.object({
  idToken: z.string().min(1, 'Token do Google obrigatório'),
});

export type GoogleSignInDto = z.infer<typeof googleSignInSchema>;
