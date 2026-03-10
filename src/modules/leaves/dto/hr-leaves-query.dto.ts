import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { LeaveStatus } from '../entities/leave.entity.js';

export class HrLeavesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by leave status',
    enum: LeaveStatus,
  })
  @IsOptional()
  @IsEnum(LeaveStatus, {
    message: 'status must be one of: pending, approved, rejected, cancelled',
  })
  status?: LeaveStatus;

  @ApiPropertyOptional({ description: 'Filter by employee user ID' })
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Leaves starting on or after this date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Leaves ending on or before this date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1, { message: 'page must be a positive integer' })
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit must be between 1 and 100' })
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    default: 'createdAt',
    enum: ['createdAt', 'startDate', 'status'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'startDate', 'status'], {
    message: 'sortBy must be one of: createdAt, startDate, status',
  })
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sortOrder must be asc or desc',
  })
  sortOrder: 'asc' | 'desc' = 'desc';
}
