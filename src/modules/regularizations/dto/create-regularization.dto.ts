import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { RegularizationRequestType } from '../entities/regularization-request.entity.js';

export class CreateRegularizationDto {
  @ApiProperty({
    description: 'The work date to regularize (YYYY-MM-DD)',
    example: '2026-03-18',
  })
  @IsDateString(
    {},
    { message: 'requestDate must be a valid date (YYYY-MM-DD)' }
  )
  @IsNotEmpty()
  requestDate!: string;

  @ApiProperty({
    description: 'Requested punch-in time (ISO 8601)',
    example: '2026-03-18T09:00:00.000Z',
  })
  @IsDateString({}, { message: 'requestedPunchIn must be a valid ISO date' })
  @IsNotEmpty()
  requestedPunchIn!: string;

  @ApiProperty({
    description: 'Requested punch-out time (ISO 8601)',
    example: '2026-03-18T18:00:00.000Z',
  })
  @IsDateString({}, { message: 'requestedPunchOut must be a valid ISO date' })
  @IsNotEmpty()
  requestedPunchOut!: string;

  @ApiProperty({
    description: 'Type of regularization request',
    enum: RegularizationRequestType,
    example: RegularizationRequestType.FORGOT_TO_PUNCH,
  })
  @IsEnum(RegularizationRequestType, {
    message:
      'requestType must be one of: missed_punch_in, missed_punch_out, incorrect_time, forgot_to_punch, other',
  })
  requestType!: RegularizationRequestType;

  @ApiPropertyOptional({
    description: 'Reason for regularization',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000, { message: 'reason must not exceed 1000 characters' })
  @IsOptional()
  reason?: string;
}
