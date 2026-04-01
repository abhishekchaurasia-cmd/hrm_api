import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PartialDaySubSettingDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ default: 120 })
  @IsInt()
  @Min(0)
  @Max(480)
  maxMinutes!: number;
}

export class PartialDaySettingsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ enum: ['minutes', 'hours'], default: 'minutes' })
  @IsEnum(['minutes', 'hours'] as const)
  limitUnit!: 'minutes' | 'hours';

  @ApiProperty({ default: 120 })
  @IsInt()
  @Min(0)
  @Max(960)
  limitValue!: number;

  @ApiProperty({ enum: ['day', 'week', 'month'], default: 'day' })
  @IsEnum(['day', 'week', 'month'] as const)
  limitPeriod!: 'day' | 'week' | 'month';

  @ApiProperty({ type: PartialDaySubSettingDto })
  @ValidateNested()
  @Type(() => PartialDaySubSettingDto)
  lateArrival!: PartialDaySubSettingDto;

  @ApiProperty({ type: PartialDaySubSettingDto })
  @ValidateNested()
  @Type(() => PartialDaySubSettingDto)
  earlyLeaving!: PartialDaySubSettingDto;

  @ApiProperty({ type: PartialDaySubSettingDto })
  @ValidateNested()
  @Type(() => PartialDaySubSettingDto)
  interveningTimeOff!: PartialDaySubSettingDto;

  @ApiProperty({ default: 2 })
  @IsInt()
  @Min(0)
  @Max(100)
  requestsAllowed!: number;

  @ApiProperty({ enum: ['monthly', 'weekly'], default: 'monthly' })
  @IsEnum(['monthly', 'weekly'] as const)
  requestsPeriod!: 'monthly' | 'weekly';

  @ApiProperty({ default: true })
  @IsBoolean()
  approvalRequired!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  commentMandatory!: boolean;

  @ApiProperty({ default: 7 })
  @IsInt()
  @Min(0)
  @Max(90)
  advanceDaysLimit!: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  allowPastDated!: boolean;
}

export class AdjustmentSettingsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ default: 2 })
  @IsInt()
  @Min(0)
  @Max(100)
  adjustmentEntries!: number;

  @ApiProperty({ enum: ['week', 'month'], default: 'month' })
  @IsEnum(['week', 'month'] as const)
  adjustmentPeriod!: 'week' | 'month';

  @ApiProperty({ default: 7 })
  @IsInt()
  @Min(0)
  @Max(90)
  pastDaysLimit!: number;

  @ApiProperty({ default: 25 })
  @IsInt()
  @Min(1)
  @Max(31)
  lastDateOfMonth!: number;
}

export class RegularizationSettingsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ default: 2 })
  @IsInt()
  @Min(0)
  @Max(100)
  entries!: number;

  @ApiProperty({ enum: ['week', 'month'], default: 'month' })
  @IsEnum(['week', 'month'] as const)
  period!: 'week' | 'month';

  @ApiProperty({ default: 7 })
  @IsInt()
  @Min(0)
  @Max(90)
  pastDaysLimit!: number;

  @ApiProperty({ default: 25 })
  @IsInt()
  @Min(1)
  @Max(31)
  lastDateOfMonth!: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  reasonRequired!: boolean;
}

export class ApprovalLevelDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(10)
  level!: number;

  @ApiProperty({
    enum: ['reporting_manager', 'hr', 'custom'],
    default: 'reporting_manager',
  })
  @IsEnum(['reporting_manager', 'hr', 'custom'] as const)
  assigneeType!: 'reporting_manager' | 'hr' | 'custom';
}

export class ApprovalSettingsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ default: 3 })
  @IsInt()
  @Min(0)
  @Max(100)
  thresholdCount!: number;

  @ApiProperty({ enum: ['all', 'month'], default: 'month' })
  @IsEnum(['all', 'month'] as const)
  thresholdPeriod!: 'all' | 'month';

  @ApiPropertyOptional({ type: [ApprovalLevelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalLevelDto)
  @IsOptional()
  levels?: ApprovalLevelDto[];

  @ApiProperty({ default: false })
  @IsBoolean()
  autoApproveIfMissing!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  skipApprovalForEveryRequest!: boolean;
}
