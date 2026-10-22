import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EDITORIAS, type Editoria } from 'src/modules/books/editorias';

@Schema({ timestamps: true })
export class Recommendation {
  @Prop({ type: String, required: true, index: true })
  episodeId!: string;

  @Prop({ type: String, required: true, index: true })
  expertId!: string;

  @Prop({ type: String, required: true, index: true })
  bookId!: string;

  @Prop({ type: String, enum: EDITORIAS, required: true })
  editoria!: Editoria;

  createdAt?: Date;
  updatedAt?: Date;
}

export type RecommendationDocument = HydratedDocument<Recommendation>;
export const RecommendationSchema =
  SchemaFactory.createForClass(Recommendation);
RecommendationSchema.index(
  { episodeId: 1, expertId: 1, bookId: 1 },
  { unique: true },
);
