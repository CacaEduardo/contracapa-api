import { UserDocument } from 'src/modules/users/schemas/user.schema';

export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  active: boolean;
  mustChangePassword: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
