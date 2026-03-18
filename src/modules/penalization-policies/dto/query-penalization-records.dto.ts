import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { PenaltyType } from '../entities/penalization-rule.entity.js';
import { PenalizationRecordStatus } from '../entities/penalization-record.entity.js';

export class QueryPenalizationRecordsDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  policyId?: string;

  @ApiPropertyOptional({ enum: PenaltyType })
  @IsEnum(PenaltyType)
  @IsOptional()
  penaltyType?: PenaltyType;

  @ApiPropertyOptional({ enum: PenalizationRecordStatus })
  @IsEnum(PenalizationRecordStatus)
  @IsOptional()
  status?: PenalizationRecordStatus;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
