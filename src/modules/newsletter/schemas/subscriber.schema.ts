import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriberStatus = 'pending' | 'confirmed';

@Schema({ timestamps: true })
export class Subscriber {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  consent!: boolean;

  @Prop({ type: String, enum: ['pending', 'confirmed'], default: 'pending' })
  status!: SubscriberStatus;

  @Prop({ type: String, select: false, default: null })
  confirmationTokenHash!: string | null;

  @Prop({ type: Date, select: false, default: null })
  confirmationExpiresAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type SubscriberDocument = HydratedDocument<Subscriber>;
export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);
