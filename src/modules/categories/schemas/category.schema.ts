import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ default: 0 })
  bookCount!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);
