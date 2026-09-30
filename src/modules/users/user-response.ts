import type {
  AuthProvider,
  UserDocument,
  UserRole,
} from 'src/modules/users/schemas/user.schema';

export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  company?: string;
  favoriteCategorySlugs: string[];
  authProvider: AuthProvider;
  onboardingCompleted: boolean;
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
    company: user.company || undefined,
    favoriteCategorySlugs: user.favoriteCategorySlugs ?? [],
    authProvider: user.authProvider ?? 'password',
    onboardingCompleted: user.onboardingCompleted ?? true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
