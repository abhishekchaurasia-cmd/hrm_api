import { PartialType } from '@nestjs/swagger';

import { CreateLeaveTypeConfigDto } from './create-leave-type-config.dto.js';

export class UpdateLeaveTypeConfigDto extends PartialType(
  CreateLeaveTypeConfigDto
) {}
