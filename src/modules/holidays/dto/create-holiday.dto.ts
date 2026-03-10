import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({ description: 'Holiday name', example: 'Republic Day' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Holiday date (YYYY-MM-DD)',
    example: '2026-01-26',
  })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ description: 'Is optional holiday', default: false })
  @IsBoolean()
  @IsOptional()
  isOptional?: boolean;

  @ApiPropertyOptional({
    description: 'Is special/restricted holiday',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSpecial?: boolean;
}
