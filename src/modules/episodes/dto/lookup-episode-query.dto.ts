import { z } from 'zod';
import { youtubeUrlSchema } from 'src/modules/episodes/dto/create-episode.dto';

export const lookupEpisodeQuerySchema = z.object({
  url: youtubeUrlSchema,
});

export type LookupEpisodeQueryDto = z.infer<typeof lookupEpisodeQuerySchema>;
