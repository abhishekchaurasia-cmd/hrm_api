import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLeavePlanDto {
  @ApiProperty({ description: 'Plan name', example: 'Leave Plan 2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Calendar year', example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @ApiProperty({ description: 'Plan start date', example: '2026-01-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ description: 'Plan end date', example: '2026-12-31' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;
}
