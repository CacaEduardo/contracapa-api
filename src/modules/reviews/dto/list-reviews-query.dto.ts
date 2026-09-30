import { z } from 'zod';

function toArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? (value as string[]) : [value as string];
}

export const listReviewsQuerySchema = z.object({
  experts: z.preprocess(toArray, z.array(z.string()).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(10),
});

export type ListReviewsQueryDto = z.infer<typeof listReviewsQuerySchema>;
