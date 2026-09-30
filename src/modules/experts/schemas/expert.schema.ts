import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const EXPERT_SOCIAL_NETWORKS = [
  'instagram',
  'linkedin',
  'x',
  'youtube',
  'tiktok',
  'website',
] as const;

export type ExpertSocialNetwork = (typeof EXPERT_SOCIAL_NETWORKS)[number];

@Schema({ _id: false })
export class ExpertSocialLink {
  @Prop({ type: String, enum: EXPERT_SOCIAL_NETWORKS, required: true })
  network!: ExpertSocialNetwork;

  @Prop({ required: true })
  url!: string;
}

const ExpertSocialLinkSchema = SchemaFactory.createForClass(ExpertSocialLink);

@Schema({ timestamps: true })
export class Expert {
  @Prop({ required: true })
  fullName!: string;

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, default: null })
  company!: string | null;

  @Prop({ type: String, default: null })
  phone!: string | null;

  @Prop({ type: String, default: null })
  podcastUrl!: string | null;

  @Prop({ type: [ExpertSocialLinkSchema], default: [] })
  socialLinks!: ExpertSocialLink[];

  @Prop({ type: String, default: null })
  avatarSrc!: string | null;

  @Prop({ type: String, default: null })
  avatarKey!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ExpertDocument = HydratedDocument<Expert>;
export const ExpertSchema = SchemaFactory.createForClass(Expert);
