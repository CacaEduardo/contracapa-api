import { z } from 'zod';

export const createReviewSchema = z.object({
  expertId: z
    .string({ message: 'Selecione um especialista' })
    .regex(/^[a-fA-F0-9]{24}$/, 'Selecione um especialista'),
  bookId: z
    .string({ message: 'Selecione o livro resenhado' })
    .regex(/^[a-fA-F0-9]{24}$/, 'Selecione o livro resenhado'),
  editorialTitle: z.string().trim().min(1, 'Informe o título da resenha'),
  excerpt: z.string().trim().min(1, 'Informe um resumo para a resenha'),
  content: z.string().trim().min(1, 'Informe o conteúdo da resenha'),
  weekly: z.boolean().optional(),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
