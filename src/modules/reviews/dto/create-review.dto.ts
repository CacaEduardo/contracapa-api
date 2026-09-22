import { z } from 'zod';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';

export const createReviewSchema = z.object({
  bookId: mongoIdSchema,
  editorialTitle: z.string().trim().min(1).nullable().optional(),
  excerpt: z.string().trim().min(1, 'Informe um resumo para a resenha'),
  content: z.string().trim().min(1, 'Informe o conteúdo da resenha'),
  verdict: z.enum(['positive', 'negative']),
  weekly: z.boolean().optional(),
  podcast: z
    .object({
      spotify: z.url('URL inválida').optional(),
      youtube: z.url('URL inválida').optional(),
      apple: z.url('URL inválida').optional(),
    })
    .optional(),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
