import { z } from 'zod';

export const confirmSubscriptionQuerySchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
});

export type ConfirmSubscriptionQueryDto = z.infer<
  typeof confirmSubscriptionQuerySchema
>;
