import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Episode {
  @Prop({ required: true, unique: true, index: true })
  videoId!: string;

  @Prop({ required: true })
  youtubeUrl!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  channelName!: string;

  @Prop({ required: true })
  thumbnailUrl!: string;

  @Prop({ required: true, index: true })
  publishedAt!: Date;

  @Prop({ type: [String], default: [], index: true })
  expertIds!: string[];

  // Snapshots escritos só pelo RecommendationsService.
  @Prop({ default: 0 })
  recommendationCount!: number;

  @Prop({ type: [String], default: [] })
  recommenderIds!: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type EpisodeDocument = HydratedDocument<Episode>;
export const EpisodeSchema = SchemaFactory.createForClass(Episode);
