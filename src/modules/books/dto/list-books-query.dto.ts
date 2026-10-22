import { z } from 'zod';
import { toArray } from 'src/common/lib/to-array';
import { EDITORIAS } from 'src/modules/books/editorias';

const RECOMMENDED_SORT_MESSAGE =
  'A ordenação por recomendação exige exatamente uma editoria';

const catalogQueryShape = {
  q: z.string().trim().optional(),
  categories: z.preprocess(toArray, z.array(z.string()).optional()),
  editorias: z.preprocess(toArray, z.array(z.enum(EDITORIAS)).optional()),
  experts: z.preprocess(toArray, z.array(z.string()).optional()),
  // `hasReviews=true` restringe a livros com ao menos uma resenha.
  hasReviews: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  // `recomendados` ordena pela recomendação mais recente da editoria filtrada.
  sort: z.enum(['recentes', 'az', 'za', 'recomendados']).default('recentes'),
  page: z.coerce.number().int().min(1).default(1),
};

const hasSingleEditoriaForRecommendedSort = (query: {
  sort: string;
  editorias?: string[];
}) => query.sort !== 'recomendados' || query.editorias?.length === 1;

export const listBooksQuerySchema = z
  .object({
    ...catalogQueryShape,
    pageSize: z.coerce.number().int().min(1).max(48).default(15),
  })
  .refine(hasSingleEditoriaForRecommendedSort, {
    message: RECOMMENDED_SORT_MESSAGE,
    path: ['sort'],
  });

export const listBooksAdminQuerySchema = z
  .object({
    ...catalogQueryShape,
    status: z.enum(['all', 'active', 'inactive']).default('all'),
    pageSize: z.coerce.number().int().min(1).max(200).default(12),
  })
  .refine(hasSingleEditoriaForRecommendedSort, {
    message: RECOMMENDED_SORT_MESSAGE,
    path: ['sort'],
  });

export type ListBooksQueryDto = z.infer<typeof listBooksQuerySchema>;
export type ListBooksAdminQueryDto = z.infer<typeof listBooksAdminQuerySchema>;
