import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AdjustLeaveBalanceDto {
  @ApiProperty({ description: 'Leave balance ID to adjust' })
  @IsUUID()
  @IsNotEmpty()
  leaveBalanceId!: string;

  @ApiProperty({
    description: 'Days to adjust (+ve to credit, -ve to debit)',
    example: 2.0,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  days!: number;

  @ApiPropertyOptional({ description: 'Reason for adjustment' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
