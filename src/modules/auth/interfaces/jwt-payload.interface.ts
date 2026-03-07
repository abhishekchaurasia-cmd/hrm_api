import type { UserRole } from '../../users/entities/user.entity.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
