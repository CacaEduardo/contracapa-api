import { createBannerSchema } from 'src/modules/banners/dto/create-banner.dto';

describe('createBannerSchema', () => {
  const base = { title: 'Podcast', alt: 'Episódios', href: '/episodios' };

  it('aplica ordem 0 e ativo por padrão', () => {
    expect(createBannerSchema.parse(base)).toEqual({
      ...base,
      order: 0,
      active: true,
    });
  });

  it.each(['https://exemplo.com', '//exemplo.com', 'episodios'])(
    'rejeita link que não é caminho interno: %s',
    (href) => {
      expect(createBannerSchema.safeParse({ ...base, href }).success).toBe(
        false,
      );
    },
  );
});
