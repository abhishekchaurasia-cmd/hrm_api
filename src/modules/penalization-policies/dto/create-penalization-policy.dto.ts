import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

export class CreatePenalizationPolicyDto {
  @ApiProperty({ description: 'Policy name', example: 'Work from Office' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Policy description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Effective from date', example: '2026-04-01' })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom!: string;

  @ApiProperty({ enum: DeductionMethod })
  @IsEnum(DeductionMethod)
  deductionMethod!: DeductionMethod;

  @ApiPropertyOptional({ description: 'Buffer period in days', default: 0 })
  @IsInt()
  @Min(0)
  @Max(90)
  @IsOptional()
  bufferPeriodDays?: number;

  @ApiProperty({ type: [CreatePenalizationRuleDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePenalizationRuleDto)
  rules!: CreatePenalizationRuleDto[];
}
