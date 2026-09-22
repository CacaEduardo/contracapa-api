import { z } from 'zod';

function toArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? (value as string[]) : [value as string];
}

export const listBooksQuerySchema = z.object({
  q: z.string().trim().optional(),
  categories: z.preprocess(toArray, z.array(z.string()).optional()),
  verdicts: z.preprocess(
    toArray,
    z.array(z.enum(['positive', 'negative', 'none'])).optional(),
  ),
  sort: z.enum(['recentes', 'az', 'za']).default('recentes'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export type ListBooksQueryDto = z.infer<typeof listBooksQuerySchema>;
