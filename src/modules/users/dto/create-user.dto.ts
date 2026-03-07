import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { UserRole } from '../entities/user.entity.js';

export class CreateUserDto {
  @ApiProperty({ description: 'First name', minLength: 2 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ description: 'Last name', minLength: 2 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName!: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Department ID (UUID)' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}
