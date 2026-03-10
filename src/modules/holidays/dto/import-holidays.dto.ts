import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
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

export class ImportHolidayItemDto {
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
}

export class ImportHolidaysDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'IN',
  })
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @ApiProperty({ description: 'Year', example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({
    description:
      'Specific holidays to import. If omitted, all public holidays are imported.',
    type: [ImportHolidayItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportHolidayItemDto)
  selectedHolidays?: ImportHolidayItemDto[];
}
