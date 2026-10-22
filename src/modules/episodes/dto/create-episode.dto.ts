import { z } from 'zod';
import { parseYoutubeVideoId } from 'src/modules/episodes/youtube';

export const YOUTUBE_URL_MESSAGE = 'Informe um link válido do YouTube';

export const youtubeUrlSchema = z
  .string({ message: YOUTUBE_URL_MESSAGE })
  .trim()
  .refine((url) => parseYoutubeVideoId(url) !== null, YOUTUBE_URL_MESSAGE);

export const createEpisodeSchema = z.object({
  youtubeUrl: youtubeUrlSchema,
  title: z.string().trim().min(1, 'Informe o título do episódio'),
  channelName: z.string().trim().min(1, 'Informe o nome do podcast'),
  publishedAt: z.coerce.date({ message: 'Informe a data do episódio' }),
  expertIds: z
    .array(z.string().regex(/^[a-fA-F0-9]{24}$/, 'Especialista inválido'), {
      message: 'Selecione ao menos um especialista',
    })
    .min(1, 'Selecione ao menos um especialista')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Especialista repetido no episódio',
    ),
});

export type CreateEpisodeDto = z.infer<typeof createEpisodeSchema>;
