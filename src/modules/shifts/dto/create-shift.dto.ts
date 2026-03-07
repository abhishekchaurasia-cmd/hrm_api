import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateShiftDto {
  @ApiProperty({ description: 'Shift name', example: 'India Regular' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Unique shift code', example: 'IN-CS' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime!: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '18:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime!: string;

  @ApiPropertyOptional({ description: 'Break duration in minutes', default: 0 })
  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  breakDurationMinutes?: number;

  @ApiProperty({ description: 'Net work hours per day', example: 8.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(24)
  workHoursPerDay!: number;

  @ApiPropertyOptional({ description: 'Flexible shift?', default: false })
  @IsBoolean()
  @IsOptional()
  isFlexible?: boolean;

  @ApiPropertyOptional({
    description: 'Grace period in minutes for late',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  graceMinutes?: number;

  @ApiPropertyOptional({
    description: 'Default shift for new employees?',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
