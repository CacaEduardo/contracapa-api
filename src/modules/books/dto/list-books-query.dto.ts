import { z } from 'zod';
import { EDITORIAS } from 'src/modules/books/editorias';

function toArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? (value as string[]) : [value as string];
}

const catalogQueryShape = {
  q: z.string().trim().optional(),
  categories: z.preprocess(toArray, z.array(z.string()).optional()),
  editorias: z.preprocess(toArray, z.array(z.enum(EDITORIAS)).optional()),
  experts: z.preprocess(toArray, z.array(z.string()).optional()),
  sort: z.enum(['recentes', 'az', 'za']).default('recentes'),
  page: z.coerce.number().int().min(1).default(1),
};

export const listBooksQuerySchema = z.object({
  ...catalogQueryShape,
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const listBooksAdminQuerySchema = z.object({
  ...catalogQueryShape,
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  pageSize: z.coerce.number().int().min(1).max(200).default(12),
});

export type ListBooksQueryDto = z.infer<typeof listBooksQuerySchema>;
export type ListBooksAdminQueryDto = z.infer<typeof listBooksAdminQuerySchema>;
