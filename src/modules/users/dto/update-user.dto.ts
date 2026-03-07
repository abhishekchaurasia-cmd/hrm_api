import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { UserRole } from '../entities/user.entity.js';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name', minLength: 2 })
  @IsString()
  @IsOptional()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', minLength: 2 })
  @IsString()
  @IsOptional()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Department ID (UUID)' })
  @IsString()
  @IsOptional()
  departmentId?: string | null;
}
