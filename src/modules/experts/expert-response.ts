import type {
  ExpertDocument,
  ExpertSocialLink,
} from 'src/modules/experts/schemas/expert.schema';

// Projeção exibida ao leitor: nunca inclui e-mail nem telefone.
export type PublicExpert = {
  _id: string;
  slug: string;
  fullName: string;
  company: string | null;
  podcastUrl: string | null;
  socialLinks: ExpertSocialLink[];
  avatarSrc: string | null;
  active: boolean;
  reviewCount: number;
};

export type ExpertResponse = PublicExpert & {
  email: string;
  phone: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicExpert(expert: ExpertDocument): PublicExpert {
  return {
    _id: expert._id.toString(),
    slug: expert.slug,
    fullName: expert.fullName,
    company: expert.company,
    podcastUrl: expert.podcastUrl,
    socialLinks: expert.socialLinks.map(({ network, url }) => ({
      network,
      url,
    })),
    avatarSrc: expert.avatarSrc,
    active: expert.active,
    reviewCount: expert.reviewCount,
  };
}

export function toExpertResponse(expert: ExpertDocument): ExpertResponse {
  return {
    ...toPublicExpert(expert),
    email: expert.email,
    phone: expert.phone,
    createdAt: expert.createdAt,
    updatedAt: expert.updatedAt,
  };
}
