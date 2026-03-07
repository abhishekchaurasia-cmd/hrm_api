import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCompensationDto } from './create-compensation.dto.js';

export class UpdateCompensationDto extends PartialType(
  OmitType(CreateCompensationDto, ['userId'] as const)
) {}
