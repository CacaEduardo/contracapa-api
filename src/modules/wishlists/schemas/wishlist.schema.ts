import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class WishlistItem {
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  book!: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  addedAt!: Date;
}

const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

@Schema({ timestamps: true })
export class Wishlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 60 })
  name!: string;

  @Prop({ trim: true, maxlength: 280 })
  description?: string;

  @Prop({ default: false })
  isDefault!: boolean;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items!: WishlistItem[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type WishlistDocument = HydratedDocument<Wishlist>;
export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

WishlistSchema.index({ owner: 1, name: 1 }, { unique: true });
// Garante uma única lista padrão ("Quero ler") por pessoa.
WishlistSchema.index(
  { owner: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);
WishlistSchema.index({ 'items.book': 1 });
