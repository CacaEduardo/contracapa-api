import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { BookVerdict } from 'src/modules/books/schemas/book.schema';

export type ReviewPodcastLinks = {
  spotify?: string;
  youtube?: string;
  apple?: string;
};

@Schema({ timestamps: true, minimize: false })
export class Review {
  @Prop({ type: String, required: true, unique: true, index: true })
  bookId!: string;

  @Prop({ type: String, default: null })
  editorialTitle!: string | null;

  @Prop({ required: true })
  excerpt!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ type: String, enum: ['positive', 'negative'], required: true })
  verdict!: BookVerdict;

  @Prop({ required: true })
  publishedAt!: Date;

  @Prop({ default: false, index: true })
  weekly!: boolean;

  @Prop({ type: Object, default: {} })
  podcast!: ReviewPodcastLinks;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ReviewDocument = HydratedDocument<Review>;
export const ReviewSchema = SchemaFactory.createForClass(Review);
