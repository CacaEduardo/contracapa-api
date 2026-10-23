import type { BannerDocument } from 'src/modules/banners/schemas/banner.schema';

export type PublicBanner = {
  _id: string;
  alt: string;
  href: string;
  imageSrc: string;
  // Sem arte própria para telas estreitas, a home recorta a arte 3:1.
  mobileImageSrc: string;
};

export type BannerResponse = {
  _id: string;
  title: string;
  alt: string;
  href: string;
  order: number;
  active: boolean;
  imageSrc: string | null;
  mobileImageSrc: string | null;
};

export function toBannerResponse(banner: BannerDocument): BannerResponse {
  return {
    _id: banner._id.toString(),
    title: banner.title,
    alt: banner.alt,
    href: banner.href,
    order: banner.order,
    active: banner.active,
    imageSrc: banner.imageSrc,
    mobileImageSrc: banner.mobileImageSrc,
  };
}

export function toPublicBanner(
  banner: BannerDocument & { imageSrc: string },
): PublicBanner {
  return {
    _id: banner._id.toString(),
    alt: banner.alt,
    href: banner.href,
    imageSrc: banner.imageSrc,
    mobileImageSrc: banner.mobileImageSrc ?? banner.imageSrc,
  };
}
