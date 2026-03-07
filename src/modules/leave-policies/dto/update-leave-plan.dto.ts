import { PartialType } from '@nestjs/swagger';

import { CreateLeavePlanDto } from './create-leave-plan.dto.js';

export class UpdateLeavePlanDto extends PartialType(CreateLeavePlanDto) {}
