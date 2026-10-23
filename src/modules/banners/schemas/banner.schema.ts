import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  alt!: string;

  @Prop({ required: true })
  href!: string;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ type: String, default: null })
  imageSrc!: string | null;

  @Prop({ type: String, default: null })
  imageKey!: string | null;

  @Prop({ type: String, default: null })
  mobileImageSrc!: string | null;

  @Prop({ type: String, default: null })
  mobileImageKey!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type BannerDocument = HydratedDocument<Banner>;
export const BannerSchema = SchemaFactory.createForClass(Banner);
BannerSchema.index({ active: 1, order: 1 });
