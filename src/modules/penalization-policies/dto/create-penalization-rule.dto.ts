import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  PenaltyType,
  ThresholdType,
} from '../entities/penalization-rule.entity.js';

export class CreatePenalizationRuleDto {
  @ApiProperty({ enum: PenaltyType })
  @IsEnum(PenaltyType)
  penaltyType!: PenaltyType;

  @ApiProperty({ default: true })
  @IsBoolean()
  isEnabled!: boolean;

  @ApiProperty({
    description: 'Leave days deducted per incident',
    example: 1.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(30)
  deductionPerIncident!: number;

  @ApiPropertyOptional({ enum: ThresholdType })
  @IsEnum(ThresholdType)
  @IsOptional()
  thresholdType?: ThresholdType;

  @ApiPropertyOptional({ description: 'Threshold value (count or percentage)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  thresholdValue?: number;

  @ApiPropertyOptional({ description: 'Unit: per_day, per_week, per_month' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  thresholdUnit?: string;

  @ApiPropertyOptional({
    description: 'Minimum instances before penalty applies',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  minInstancesBeforePenalty?: number;

  @ApiPropertyOptional({
    description: 'Effective hours percentage threshold for work hour shortage',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  effectiveHoursPercentage?: number;
}
