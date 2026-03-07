import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  Gender,
  TimeType,
  WorkerType,
} from '../entities/employee-profile.entity.js';

export class CreateEmployeeProfileDto {
  @ApiProperty({ description: 'User ID to create profile for' })
  @IsUUID()
  userId!: string;

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

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nationality?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  workCountry?: string;

  @ApiProperty({ description: 'Employee number (unique)', example: 'EMP-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeNumber!: string;

  @ApiPropertyOptional({ description: 'Number series prefix', example: 'EMP' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  numberSeries?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobileNumber?: string;

  @ApiPropertyOptional({ description: 'Joining date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  jobTitle?: string;

  @ApiPropertyOptional()
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
  reportingManagerId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  dottedLineManagerId?: string;

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

  @ApiPropertyOptional({ description: 'Probation period in months' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(36)
  probationPolicyMonths?: number;

  @ApiPropertyOptional({ description: 'Notice period in days' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(365)
  noticePeriodDays?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  inviteToLogin?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enableOnboardingFlow?: boolean;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  holidayListId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  attendanceNumber?: string;
}
