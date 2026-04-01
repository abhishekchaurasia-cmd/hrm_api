import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CaptureSettingsDto } from './capture-settings.dto.js';
import {
  AdjustmentSettingsDto,
  ApprovalSettingsDto,
  PartialDaySettingsDto,
  RegularizationSettingsDto,
} from './policy-settings.dto.js';

export class CreateTimeTrackingPolicyDto {
  @ApiProperty({ description: 'Policy name', example: 'Work from Office' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Policy description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: CaptureSettingsDto })
  @ValidateNested()
  @Type(() => CaptureSettingsDto)
  @IsOptional()
  captureSettings?: CaptureSettingsDto;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  wfhAllowed?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  wfhApprovalRequired?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  onDutyAllowed?: boolean;

  @ApiPropertyOptional({ type: PartialDaySettingsDto })
  @ValidateNested()
  @Type(() => PartialDaySettingsDto)
  @IsOptional()
  partialDaySettings?: PartialDaySettingsDto;

  @ApiPropertyOptional({ type: AdjustmentSettingsDto })
  @ValidateNested()
  @Type(() => AdjustmentSettingsDto)
  @IsOptional()
  adjustmentSettings?: AdjustmentSettingsDto;

  @ApiPropertyOptional({ type: RegularizationSettingsDto })
  @ValidateNested()
  @Type(() => RegularizationSettingsDto)
  @IsOptional()
  regularizationSettings?: RegularizationSettingsDto;

  @ApiPropertyOptional({ type: ApprovalSettingsDto })
  @ValidateNested()
  @Type(() => ApprovalSettingsDto)
  @IsOptional()
  approvalSettings?: ApprovalSettingsDto;
}
