import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpdateShiftAssignmentDto {
  @ApiPropertyOptional({ description: 'New shift ID' })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'Effective from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Effective to date (YYYY-MM-DD), null for indefinite',
  })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string | null;
}
