import { z } from 'zod';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';
import { EDITORIAS } from 'src/modules/books/editorias';

const NO_INDICATION_MESSAGE = 'Indique ao menos um livro em alguma editoria';

const indicationsSchema = z
  .array(
    z.object({
      editoria: z.enum(EDITORIAS, { message: 'Editoria inválida' }),
      bookId: mongoIdSchema,
    }),
    { message: NO_INDICATION_MESSAGE },
  )
  .min(1, NO_INDICATION_MESSAGE)
  .max(EDITORIAS.length, 'Indique no máximo um livro por editoria')
  .refine(
    (indications) =>
      new Set(indications.map(({ editoria }) => editoria)).size ===
      indications.length,
    'Indique no máximo um livro por editoria',
  );

export const createReviewSchema = z.object({
  expertId: z
    .string({ message: 'Selecione um especialista' })
    .regex(/^[a-fA-F0-9]{24}$/, 'Selecione um especialista'),
  editorialTitle: z.string().trim().min(1, 'Informe o título da resenha'),
  excerpt: z.string().trim().min(1, 'Informe um resumo para a resenha'),
  content: z.string().trim().min(1, 'Informe o conteúdo da resenha'),
  indications: indicationsSchema,
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
