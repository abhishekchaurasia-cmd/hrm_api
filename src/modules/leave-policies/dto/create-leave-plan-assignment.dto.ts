import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateLeavePlanAssignmentDto {
  @ApiProperty({ description: 'Employee user ID' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Leave plan ID' })
  @IsUUID()
  @IsNotEmpty()
  leavePlanId!: string;

  @ApiProperty({ description: 'Effective from date', example: '2026-01-01' })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom!: string;

  @ApiPropertyOptional({ description: 'Effective to date (null = indefinite)' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
