import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título'),
  author: z.string().trim().min(1, 'Informe o autor'),
  year: z.coerce.number().int().min(0, 'Ano inválido'),
  pages: z.coerce.number().int().min(1, 'Número de páginas inválido'),
  amazonUrl: z.url('URL inválida').nullable().optional(),
  categorySlugs: z.array(z.string()).optional(),
});

export type CreateBookDto = z.infer<typeof createBookSchema>;
