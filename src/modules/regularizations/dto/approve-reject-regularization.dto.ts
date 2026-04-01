import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveRejectRegularizationDto {
  @ApiPropertyOptional({
    description: 'Optional note from the reviewer',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500, { message: 'reviewNote must not exceed 500 characters' })
  @IsOptional()
  reviewNote?: string;
}
