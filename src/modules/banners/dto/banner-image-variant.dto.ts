import { z } from 'zod';

export const bannerImageVariantSchema = z.enum(['desktop', 'mobile'], {
  message: 'Variante de imagem inválida',
});

export type BannerImageVariant = z.infer<typeof bannerImageVariantSchema>;
