import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserRole = 'admin' | 'user';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ unique: true, required: true })
  email!: string;

  @Prop({ select: false })
  password?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({
    required: true,
    enum: ['admin', 'user'],
    default: 'user',
    index: true,
  })
  role!: UserRole;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ default: false })
  mustChangePassword!: boolean;

  @Prop()
  phone?: string;

  @Prop({ select: false })
  passwordResetTokenHash?: string;

  @Prop({ select: false })
  passwordResetExpiresAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
