import { UserRole } from '../../users/entities/user.entity.js';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
