import { z } from 'zod';

export const subscribeSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome'),
  email: z.email('E-mail inválido'),
  consent: z.literal(true),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;
