import { z } from 'zod';
import {
  AMAZON_PRODUCT_URL_MESSAGE,
  toAmazonAffiliateUrl,
} from 'src/modules/books/amazon-link';

const amazonUrlSchema = z
  .string()
  .trim()
  .pipe(z.url('URL inválida'))
  .refine((value) => toAmazonAffiliateUrl(value) !== null, {
    message: AMAZON_PRODUCT_URL_MESSAGE,
  })
  .transform((value) => toAmazonAffiliateUrl(value)!);

export const createBookSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título'),
  author: z.string().trim().min(1, 'Informe o autor'),
  description: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
  year: z.coerce.number().int().min(0, 'Ano inválido'),
  pages: z.coerce.number().int().min(1, 'Número de páginas inválido'),
  amazonUrl: amazonUrlSchema.nullable().optional(),
  categorySlugs: z.array(z.string()).optional(),
});

export type CreateBookDto = z.infer<typeof createBookSchema>;
