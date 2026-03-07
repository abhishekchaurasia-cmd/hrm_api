import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  CalculationType,
  ComponentType,
} from '../entities/salary-component.entity.js';

export class CreateSalaryComponentDto {
  @ApiProperty({ example: 'Basic Salary' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'BASIC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ enum: ComponentType })
  @IsEnum(ComponentType)
  componentType!: ComponentType;

  @ApiProperty({ enum: CalculationType })
  @IsEnum(CalculationType)
  calculationType!: CalculationType;

  @ApiPropertyOptional({
    description: 'Default percentage (e.g. 40.00)',
    example: 40.0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  defaultPercentage?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;
}
