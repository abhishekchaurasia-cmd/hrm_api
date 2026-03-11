import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Compensation } from '../compensation/entities/compensation.entity.js';
import { SalaryBreakup } from '../compensation/entities/salary-breakup.entity.js';
import { HolidayList } from '../holidays/entities/holiday-list.entity.js';
import { LeaveBalance } from '../leave-policies/entities/leave-balance.entity.js';
import { LeavePlanAssignment } from '../leave-policies/entities/leave-plan-assignment.entity.js';
import { LeavePlan } from '../leave-policies/entities/leave-plan.entity.js';
import { LeaveTransaction } from '../leave-policies/entities/leave-transaction.entity.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { Shift } from '../shifts/entities/shift.entity.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';

import { EmployeeOnboardingController } from './employee-onboarding.controller.js';
import { EmployeeOnboardingService } from './employee-onboarding.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      EmployeeProfile,
      HolidayList,
      Shift,
      ShiftAssignment,
      LeavePlan,
      LeavePlanAssignment,
      LeaveBalance,
      LeaveTransaction,
      Compensation,
      SalaryBreakup,
    ]),
  ],
  controllers: [EmployeeOnboardingController],
  providers: [EmployeeOnboardingService],
})
export class EmployeeOnboardingModule {}
