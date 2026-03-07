import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateShiftAssignmentDto {
  @ApiProperty({ description: 'Employee user ID' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Shift ID to assign' })
  @IsUUID()
  @IsNotEmpty()
  shiftId!: string;

  @ApiProperty({ description: 'Effective from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom!: string;

  @ApiPropertyOptional({
    description: 'Effective to date (YYYY-MM-DD), null for indefinite',
  })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
