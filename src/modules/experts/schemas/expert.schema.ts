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

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  email!: string | null;

  @Prop({ type: String, default: null })
  company!: string | null;

  @Prop({ type: String, default: null })
  phone!: string | null;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: [ExpertSocialLinkSchema], default: [] })
  socialLinks!: ExpertSocialLink[];

  @Prop({ type: String, default: null })
  avatarSrc!: string | null;

  @Prop({ type: String, default: null })
  avatarKey!: string | null;

  @Prop({ default: true, index: true })
  active!: boolean;

  @Prop({ default: 0 })
  reviewCount!: number;

  @Prop({ default: 0 })
  episodeCount!: number;

  @Prop({ default: 0 })
  recommendationCount!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ExpertDocument = HydratedDocument<Expert>;
export const ExpertSchema = SchemaFactory.createForClass(Expert);

// Vários especialistas podem ficar sem e-mail; a unicidade vale só quando ele existe.
ExpertSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
  },
);
ExpertSchema.set('autoIndex', false);
