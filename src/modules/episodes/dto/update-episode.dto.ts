import { z } from 'zod';
import { createEpisodeSchema } from 'src/modules/episodes/dto/create-episode.dto';

export const updateEpisodeSchema = createEpisodeSchema.partial();

export type UpdateEpisodeDto = z.infer<typeof updateEpisodeSchema>;
