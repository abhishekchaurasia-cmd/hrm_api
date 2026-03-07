import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { LeaveStatus } from '../entities/leave.entity.js';

export class ReviewLeaveDto {
  @ApiProperty({
    description: 'New status',
    enum: [LeaveStatus.APPROVED, LeaveStatus.REJECTED],
  })
  @IsEnum(LeaveStatus)
  @IsNotEmpty()
  status!: LeaveStatus.APPROVED | LeaveStatus.REJECTED;

  @ApiPropertyOptional({ description: 'Review note' })
  @IsString()
  @IsOptional()
  reviewNote?: string;
}
