import { z } from 'zod';
import { EXPERT_SOCIAL_NETWORKS } from 'src/modules/experts/schemas/expert.schema';

const MAX_SOCIAL_LINKS = 10;

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();

export const createExpertSchema = z.object({
  fullName: z.string().trim().min(1, 'Informe o nome completo'),
  email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido')),
  company: optionalText,
  phone: optionalText,
  podcastUrl: z.url('URL do podcast inválida').nullable().optional(),
  socialLinks: z
    .array(
      z.object({
        network: z.enum(EXPERT_SOCIAL_NETWORKS, {
          message: 'Rede social inválida',
        }),
        url: z.url('URL da rede social inválida'),
      }),
    )
    .max(
      MAX_SOCIAL_LINKS,
      `Informe no máximo ${MAX_SOCIAL_LINKS} redes sociais`,
    )
    .optional(),
});

export type CreateExpertDto = z.infer<typeof createExpertSchema>;
