import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Holiday } from '../holidays/entities/holiday.entity.js';
import { Leave } from '../leaves/entities/leave.entity.js';
import { PenalizationRecord } from '../penalization-policies/entities/penalization-record.entity.js';
import { ShiftsModule } from '../shifts/shifts.module.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { TimeTrackingPoliciesModule } from '../time-tracking-policies/time-tracking-policies.module.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';

import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';
import { Attendance } from './entities/attendance.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      User,
      EmployeeProfile,
      ShiftWeeklyOff,
      Holiday,
      Leave,
      PenalizationRecord,
    ]),
    ShiftsModule,
    TimeTrackingPoliciesModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, RolesGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}
