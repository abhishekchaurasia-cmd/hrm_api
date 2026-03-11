import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { LeaveType } from '../entities/leave.entity.js';

export class CreateLeaveDto {
  @ApiPropertyOptional({
    description: 'Leave type (legacy enum, use leaveTypeConfigId instead)',
    enum: LeaveType,
  })
  @IsEnum(LeaveType)
  @IsOptional()
  leaveType?: LeaveType;

  @ApiPropertyOptional({
    description: 'Leave type config ID from the assigned leave plan',
  })
  @IsUUID()
  @IsOptional()
  leaveTypeConfigId?: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a half-day leave',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isHalfDay?: boolean;

  @ApiPropertyOptional({
    description: 'Half-day type (required when isHalfDay is true)',
    enum: ['first_half', 'second_half'],
  })
  @IsString()
  @IsIn(['first_half', 'second_half'])
  @IsOptional()
  halfDayType?: string;
}
