import { z } from 'zod';

export const signUpSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo').max(120),
  email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido')),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  company: z.string().trim().max(120).optional(),
  favoriteCategorySlugs: z.array(z.string().min(1)).default([]),
});

export type SignUpDto = z.infer<typeof signUpSchema>;
