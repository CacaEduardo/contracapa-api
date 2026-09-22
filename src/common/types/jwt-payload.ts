import type { UserRole } from 'src/modules/users/schemas/user.schema';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
};
