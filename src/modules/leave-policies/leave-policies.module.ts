import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { User } from '../users/entities/user.entity.js';

import { LeaveBalance } from './entities/leave-balance.entity.js';
import { LeavePlanAssignment } from './entities/leave-plan-assignment.entity.js';
import { LeavePlan } from './entities/leave-plan.entity.js';
import { LeaveTransaction } from './entities/leave-transaction.entity.js';
import { LeaveTypeConfig } from './entities/leave-type-config.entity.js';
import { LeaveBalancesController } from './leave-balances.controller.js';
import { LeaveBalancesService } from './leave-balances.service.js';
import { LeavePlanAssignmentsController } from './leave-plan-assignments.controller.js';
import { LeavePlanAssignmentsService } from './leave-plan-assignments.service.js';
import { LeavePlansController } from './leave-plans.controller.js';
import { LeavePlansService } from './leave-plans.service.js';
import { LeaveTypeConfigsService } from './leave-type-configs.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeavePlan,
      LeaveTypeConfig,
      LeavePlanAssignment,
      LeaveBalance,
      LeaveTransaction,
      User,
    ]),
  ],
  controllers: [
    LeavePlansController,
    LeavePlanAssignmentsController,
    LeaveBalancesController,
  ],
  providers: [
    LeavePlansService,
    LeaveTypeConfigsService,
    LeavePlanAssignmentsService,
    LeaveBalancesService,
    RolesGuard,
  ],
  exports: [
    LeavePlansService,
    LeaveTypeConfigsService,
    LeavePlanAssignmentsService,
    LeaveBalancesService,
  ],
})
export class LeavePoliciesModule {}
