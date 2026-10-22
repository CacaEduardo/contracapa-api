import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ type: String, required: true, index: true })
  expertId!: string;

  @Prop({ type: String, required: true, index: true })
  bookId!: string;

  @Prop({ required: true })
  editorialTitle!: string;

  @Prop({ required: true })
  excerpt!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true })
  publishedAt!: Date;

  @Prop({ default: false, index: true })
  weekly!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ReviewDocument = HydratedDocument<Review>;
export const ReviewSchema = SchemaFactory.createForClass(Review);
