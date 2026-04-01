import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import {
  SalaryStructureType,
  TaxRegime,
} from '../entities/compensation.entity.js';

export class CreateCompensationDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Annual CTC', example: 1200000 })
  @IsNumber()
  @Min(0)
  annualSalary!: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({
    description: 'Salary effective from date',
    example: '2026-03-01',
  })
  @IsDateString()
  salaryEffectiveFrom!: string;

  @ApiProperty({ description: 'Regular (base) salary', example: 1100000 })
  @IsNumber()
  @Min(0)
  regularSalary!: number;

  @ApiPropertyOptional({
    description: 'Bonus amount',
    default: 0,
    example: 100000,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bonus?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  bonusIncludedInCtc?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPfEligible?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isEsiEligible?: boolean;

  @ApiPropertyOptional({ example: 'Default pay group' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  payGroup?: string;

  @ApiPropertyOptional({
    enum: SalaryStructureType,
    default: SalaryStructureType.RANGE_BASED,
  })
  @IsEnum(SalaryStructureType)
  @IsOptional()
  salaryStructureType?: SalaryStructureType;

  @ApiPropertyOptional({ enum: TaxRegime, default: TaxRegime.NEW_REGIME })
  @IsEnum(TaxRegime)
  @IsOptional()
  taxRegime?: TaxRegime;
}
