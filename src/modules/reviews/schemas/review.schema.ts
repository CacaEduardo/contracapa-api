import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EDITORIAS, type Editoria } from 'src/modules/books/editorias';

export type ReviewPodcastLinks = {
  spotify?: string;
  youtube?: string;
  apple?: string;
};

@Schema({ _id: false })
export class ReviewIndication {
  @Prop({ type: String, enum: EDITORIAS, required: true })
  editoria!: Editoria;

  @Prop({ type: String, required: true })
  bookId!: string;
}

const ReviewIndicationSchema = SchemaFactory.createForClass(ReviewIndication);

@Schema({ timestamps: true, minimize: false })
export class Review {
  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ type: String, required: true, index: true })
  expertId!: string;

  @Prop({ required: true })
  editorialTitle!: string;

  @Prop({ required: true })
  excerpt!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ type: [ReviewIndicationSchema], required: true })
  indications!: ReviewIndication[];

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
ReviewSchema.index({ 'indications.bookId': 1 });
