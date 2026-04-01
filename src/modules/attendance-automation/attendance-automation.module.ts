import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Attendance } from '../attendance/entities/attendance.entity.js';
import { Holiday } from '../holidays/entities/holiday.entity.js';
import { HolidayList } from '../holidays/entities/holiday-list.entity.js';
import { Leave } from '../leaves/entities/leave.entity.js';
import { PenalizationPoliciesModule } from '../penalization-policies/penalization-policies.module.js';
import { PenalizationPolicyAssignment } from '../penalization-policies/entities/penalization-policy-assignment.entity.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';

import { AttendanceAutomationService } from './attendance-automation.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      User,
      EmployeeProfile,
      ShiftAssignment,
      ShiftWeeklyOff,
      Holiday,
      HolidayList,
      Leave,
      PenalizationPolicyAssignment,
    ]),
    PenalizationPoliciesModule,
  ],
  providers: [AttendanceAutomationService],
  exports: [AttendanceAutomationService],
})
export class AttendanceAutomationModule {}
