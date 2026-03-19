import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Attendance } from '../attendance/entities/attendance.entity.js';
import { Compensation } from '../compensation/entities/compensation.entity.js';
import { SalaryBreakup } from '../compensation/entities/salary-breakup.entity.js';
import { Holiday } from '../holidays/entities/holiday.entity.js';
import { Leave } from '../leaves/entities/leave.entity.js';
import { LeaveTypeConfig } from '../leave-policies/entities/leave-type-config.entity.js';
import { PenalizationRecord } from '../penalization-policies/entities/penalization-record.entity.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';

import { PayrollDailyDetail } from './entities/payroll-daily-detail.entity.js';
import { PayrollReportDetail } from './entities/payroll-report-detail.entity.js';
import { PayrollReport } from './entities/payroll-report.entity.js';
import { PayrollReportsController } from './payroll-reports.controller.js';
import { PayrollReportsService } from './payroll-reports.service.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollReport,
      PayrollReportDetail,
      PayrollDailyDetail,
      User,
      EmployeeProfile,
      Attendance,
      ShiftAssignment,
      ShiftWeeklyOff,
      Holiday,
      Leave,
      LeaveTypeConfig,
      PenalizationRecord,
      Compensation,
      SalaryBreakup,
    ]),
  ],
  controllers: [PayrollReportsController],
  providers: [PayrollReportsService, RolesGuard],
  exports: [PayrollReportsService],
})
export class PayrollReportsModule {}
