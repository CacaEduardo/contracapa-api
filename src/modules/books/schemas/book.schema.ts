import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EDITORIAS, type Editoria } from 'src/modules/books/editorias';

@Schema({ timestamps: true })
export class Book {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true })
  author!: string;

  @Prop({ type: String, default: null })
  description!: string | null;

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

  @Prop({ default: true, index: true })
  active!: boolean;

  @Prop({ type: [String], enum: EDITORIAS, default: [], index: true })
  editorias!: Editoria[];

  @Prop({ type: [String], default: [], index: true })
  expertSlugs!: string[];

  @Prop({ default: 0 })
  recommendationCount!: number;

  @Prop({ default: 0 })
  disrecommendationCount!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type BookDocument = HydratedDocument<Book>;
export const BookSchema = SchemaFactory.createForClass(Book);
