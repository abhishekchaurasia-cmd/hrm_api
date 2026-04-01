import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Attendance } from '../attendance/entities/attendance.entity.js';
import { ShiftsModule } from '../shifts/shifts.module.js';
import { User } from '../users/entities/user.entity.js';

import { PenalizationPolicyAssignment } from './entities/penalization-policy-assignment.entity.js';
import { PenalizationPolicyVersion } from './entities/penalization-policy-version.entity.js';
import { PenalizationPolicy } from './entities/penalization-policy.entity.js';
import { PenalizationRecord } from './entities/penalization-record.entity.js';
import { PenalizationRule } from './entities/penalization-rule.entity.js';
import { PenalizationAssignmentsController } from './penalization-assignments.controller.js';
import { PenalizationAssignmentsService } from './penalization-assignments.service.js';
import { PenalizationPoliciesController } from './penalization-policies.controller.js';
import { PenalizationPoliciesService } from './penalization-policies.service.js';
import { PenalizationRecordsController } from './penalization-records.controller.js';
import { PenalizationRecordsService } from './penalization-records.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PenalizationPolicy,
      PenalizationPolicyVersion,
      PenalizationRule,
      PenalizationPolicyAssignment,
      PenalizationRecord,
      Attendance,
      User,
    ]),
    ShiftsModule,
  ],
  controllers: [
    PenalizationPoliciesController,
    PenalizationAssignmentsController,
    PenalizationRecordsController,
  ],
  providers: [
    PenalizationPoliciesService,
    PenalizationAssignmentsService,
    PenalizationRecordsService,
    RolesGuard,
  ],
  exports: [
    PenalizationPoliciesService,
    PenalizationAssignmentsService,
    PenalizationRecordsService,
  ],
})
export class PenalizationPoliciesModule {}
