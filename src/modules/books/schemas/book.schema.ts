import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EDITORIAS, type Editoria } from 'src/modules/books/editorias';

// Data da recomendação mais recente do livro em cada editoria (ordena a home).
export type BookRecommendedAt = Partial<Record<Editoria, Date>>;

@Schema({ timestamps: true, minimize: false })
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
  recommenderSlugs!: string[];

  @Prop({ default: 0 })
  recommendationCount!: number;

  @Prop({ default: 0 })
  disrecommendationCount!: number;

  @Prop({ type: Object, default: {} })
  recommendedAt!: BookRecommendedAt;

  @Prop({ type: [String], default: [], index: true })
  reviewerSlugs!: string[];

  @Prop({ default: 0, index: true })
  reviewCount!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type BookDocument = HydratedDocument<Book>;
export const BookSchema = SchemaFactory.createForClass(Book);
BookSchema.index({ 'recommendedAt.market': -1 });
BookSchema.index({ 'recommendedAt.off_market': -1 });
BookSchema.index({ 'recommendedAt.disrecommended': -1 });
