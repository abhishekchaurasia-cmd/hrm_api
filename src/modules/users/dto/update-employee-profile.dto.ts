import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEmployeeProfileDto } from './create-employee-profile.dto.js';

export class UpdateEmployeeProfileDto extends PartialType(
  OmitType(CreateEmployeeProfileDto, ['userId', 'employeeNumber'] as const)
) {}
