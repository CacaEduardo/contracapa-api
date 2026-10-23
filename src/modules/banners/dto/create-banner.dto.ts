import { z } from 'zod';

export const createBannerSchema = z.object({
  title: z.string().trim().min(1, 'Informe o nome do destaque'),
  alt: z.string().trim().min(1, 'Descreva a imagem do destaque'),
  href: z
    .string()
    .trim()
    .regex(/^\/(?!\/)/, 'Informe um caminho interno do site, começando com /'),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export type CreateBannerDto = z.infer<typeof createBannerSchema>;
