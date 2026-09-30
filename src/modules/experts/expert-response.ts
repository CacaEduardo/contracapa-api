import type {
  ExpertDocument,
  ExpertSocialLink,
} from 'src/modules/experts/schemas/expert.schema';

export type ExpertResponse = {
  _id: string;
  slug: string;
  fullName: string;
  email: string;
  company: string | null;
  phone: string | null;
  podcastUrl: string | null;
  socialLinks: ExpertSocialLink[];
  avatarSrc: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toExpertResponse(expert: ExpertDocument): ExpertResponse {
  return {
    _id: expert._id.toString(),
    slug: expert.slug,
    fullName: expert.fullName,
    email: expert.email,
    company: expert.company,
    phone: expert.phone,
    podcastUrl: expert.podcastUrl,
    socialLinks: expert.socialLinks.map(({ network, url }) => ({
      network,
      url,
    })),
    avatarSrc: expert.avatarSrc,
    createdAt: expert.createdAt,
    updatedAt: expert.updatedAt,
  };
}
