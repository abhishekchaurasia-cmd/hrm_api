import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { DeductionMethod } from '../entities/penalization-policy-version.entity.js';

import { CreatePenalizationRuleDto } from './create-penalization-rule.dto.js';

export class UpdatePenalizationPolicyDto {
  @ApiPropertyOptional({ description: 'Policy name' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Policy description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'New effective from date',
    example: '2026-05-01',
  })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ enum: DeductionMethod })
  @IsEnum(DeductionMethod)
  @IsOptional()
  deductionMethod?: DeductionMethod;

  @ApiPropertyOptional({ description: 'Buffer period in days' })
  @IsInt()
  @Min(0)
  @Max(90)
  @IsOptional()
  bufferPeriodDays?: number;

  @ApiPropertyOptional({ type: [CreatePenalizationRuleDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePenalizationRuleDto)
  @IsOptional()
  rules?: CreatePenalizationRuleDto[];
}
