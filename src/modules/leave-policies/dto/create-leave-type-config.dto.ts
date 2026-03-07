import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { YearEndAction } from '../entities/leave-type-config.entity.js';

export class CreateLeaveTypeConfigDto {
  @ApiProperty({ description: 'Leave type name', example: 'Sick Leave' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Unique code within plan', example: 'SL' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ description: 'Annual quota', example: 6.0 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(365)
  quota!: number;

  @ApiPropertyOptional({ description: 'Unlimited leave type?', default: false })
  @IsBoolean()
  @IsOptional()
  isUnlimited?: boolean;

  @ApiPropertyOptional({ description: 'Paid leave?', default: true })
  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @ApiPropertyOptional({
    description: 'Year-end action',
    enum: YearEndAction,
    default: YearEndAction.RESET_TO_ZERO,
  })
  @IsEnum(YearEndAction)
  @IsOptional()
  yearEndAction?: YearEndAction;

  @ApiPropertyOptional({
    description: 'Max days to carry forward',
    example: 10,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @IsOptional()
  maxCarryForward?: number;

  @ApiPropertyOptional({
    description: 'Carried-forward leave expiry in days',
    example: 90,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  carryForwardExpiryDays?: number;

  @ApiPropertyOptional({ description: 'Encashable?', default: false })
  @IsBoolean()
  @IsOptional()
  isEncashable?: boolean;
}
