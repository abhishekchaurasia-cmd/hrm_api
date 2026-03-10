import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { TaxRegime } from '../../compensation/entities/compensation.entity.js';
import {
  Gender,
  TimeType,
  WorkerType,
} from '../../users/entities/employee-profile.entity.js';

class BasicDetailsDto {
  @ApiProperty({ example: 'Saikanth' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName!: string;

  @ApiProperty({ example: 'Joshi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName!: string;

  @ApiProperty({ example: 'saikanth@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Temporary password', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  middleName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: '1995-06-19' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nationality?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  workCountry?: string;

  @ApiPropertyOptional({ example: 'EMP-044' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  employeeNumber?: string;

  @ApiPropertyOptional({ example: 'EMP' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  numberSeries?: string;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobileNumber?: string;
}

class JobDetailsDto {
  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Frontend Engineer' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  secondaryJobTitle?: string;

  @ApiPropertyOptional({ enum: TimeType })
  @IsEnum(TimeType)
  @IsOptional()
  timeType?: TimeType;

  @ApiPropertyOptional({ enum: WorkerType })
  @IsEnum(WorkerType)
  @IsOptional()
  workerType?: WorkerType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  legalEntityId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  businessUnitId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  reportingManagerId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  dottedLineManagerId?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(36)
  probationPolicyMonths?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(365)
  noticePeriodDays?: number;
}

class MoreDetailsDto {
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  inviteToLogin?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  enableOnboardingFlow?: boolean;

  @ApiPropertyOptional({ description: 'Leave plan ID to assign' })
  @IsUUID()
  @IsOptional()
  leavePlanId?: string;

  @ApiPropertyOptional({ description: 'Holiday list ID to assign' })
  @IsUUID()
  @IsOptional()
  holidayListId?: string;

  @ApiPropertyOptional({ description: 'Shift ID to assign' })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({ example: 'ATT-044' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  attendanceNumber?: string;
}

class BreakupItemDto {
  @ApiProperty()
  @IsUUID()
  salaryComponentId!: string;

  @ApiProperty({ example: 480000 })
  @IsNumber()
  @Min(0)
  annualAmount!: number;
}

class CompensationDetailsDto {
  @ApiProperty({ example: 1200000 })
  @IsNumber()
  @Min(0)
  annualSalary!: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  salaryEffectiveFrom!: string;

  @ApiProperty({ example: 1100000 })
  @IsNumber()
  @Min(0)
  regularSalary!: number;

  @ApiPropertyOptional({ default: 0, example: 100000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bonus?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isEsiEligible?: boolean;

  @ApiPropertyOptional({ enum: TaxRegime })
  @IsEnum(TaxRegime)
  @IsOptional()
  taxRegime?: TaxRegime;

  @ApiPropertyOptional({ type: [BreakupItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreakupItemDto)
  breakup?: BreakupItemDto[];
}

export class OnboardEmployeeDto {
  @ApiProperty({ type: BasicDetailsDto })
  @ValidateNested()
  @Type(() => BasicDetailsDto)
  basicDetails!: BasicDetailsDto;

  @ApiPropertyOptional({ type: JobDetailsDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => JobDetailsDto)
  jobDetails?: JobDetailsDto;

  @ApiPropertyOptional({ type: MoreDetailsDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => MoreDetailsDto)
  moreDetails?: MoreDetailsDto;

  @ApiPropertyOptional({ type: CompensationDetailsDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => CompensationDetailsDto)
  compensation?: CompensationDetailsDto;
}
