import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BookVerdict = 'positive' | 'negative';

@Schema({ timestamps: true })
export class Book {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true })
  author!: string;

  @Prop({ required: true })
  year!: number;

  @Prop({ required: true })
  pages!: number;

  @Prop({ type: String, default: null })
  coverSrc!: string | null;

  @Prop({ type: String, default: null })
  coverKey!: string | null;

  @Prop({ type: String, default: null })
  amazonUrl!: string | null;

  @Prop({ type: [String], default: [], index: true })
  categorySlugs!: string[];

  @Prop({ type: String, default: null, index: true })
  reviewId!: string | null;

  @Prop({ type: String, enum: ['positive', 'negative'], default: null })
  reviewVerdict!: BookVerdict | null;

  @Prop({ default: false })
  reviewWeekly!: boolean;

  @Prop({ type: Date, default: null })
  reviewPublishedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type BookDocument = HydratedDocument<Book>;
export const BookSchema = SchemaFactory.createForClass(Book);
