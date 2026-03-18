import { PartialType } from '@nestjs/swagger';

import { CreateTimeTrackingPolicyDto } from './create-time-tracking-policy.dto.js';

export class UpdateTimeTrackingPolicyDto extends PartialType(
  CreateTimeTrackingPolicyDto
) {}
