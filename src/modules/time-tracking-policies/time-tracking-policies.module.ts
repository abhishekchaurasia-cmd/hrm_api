import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { User } from '../users/entities/user.entity.js';

import { TimeTrackingPolicyAssignment } from './entities/time-tracking-policy-assignment.entity.js';
import { TimeTrackingPolicy } from './entities/time-tracking-policy.entity.js';
import { TimeTrackingPoliciesController } from './time-tracking-policies.controller.js';
import { TimeTrackingPoliciesService } from './time-tracking-policies.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeTrackingPolicy,
      TimeTrackingPolicyAssignment,
      User,
    ]),
  ],
  controllers: [TimeTrackingPoliciesController],
  providers: [TimeTrackingPoliciesService, RolesGuard],
  exports: [TimeTrackingPoliciesService],
})
export class TimeTrackingPoliciesModule {}
