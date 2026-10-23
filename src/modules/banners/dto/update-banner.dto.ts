import { z } from 'zod';
import { createBannerSchema } from 'src/modules/banners/dto/create-banner.dto';

export const updateBannerSchema = createBannerSchema.partial();

export type UpdateBannerDto = z.infer<typeof updateBannerSchema>;
