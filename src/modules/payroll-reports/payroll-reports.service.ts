import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, LessThanOrEqual, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import {
  Attendance,
  AttendanceStatus,
} from '../attendance/entities/attendance.entity.js';
import { Compensation } from '../compensation/entities/compensation.entity.js';
import { SalaryBreakup } from '../compensation/entities/salary-breakup.entity.js';
import { Holiday } from '../holidays/entities/holiday.entity.js';
import {
  Leave,
  LeaveStatus,
  LeaveType,
} from '../leaves/entities/leave.entity.js';
import {
  PenalizationRecord,
  PenalizationRecordStatus,
} from '../penalization-policies/entities/penalization-record.entity.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Department } from '../departments/entities/department.entity.js';

import {
  DayType,
  PayrollDailyDetail,
} from './entities/payroll-daily-detail.entity.js';
import { PayrollReportDetail } from './entities/payroll-report-detail.entity.js';
import {
  PayrollReport,
  PayrollReportStatus,
} from './entities/payroll-report.entity.js';

@Injectable()
export class PayrollReportsService {
  private readonly logger = new Logger(PayrollReportsService.name);

  constructor(
    @InjectRepository(PayrollReport)
    private readonly reportRepo: Repository<PayrollReport>,
    @InjectRepository(PayrollReportDetail)
    private readonly detailRepo: Repository<PayrollReportDetail>,
    @InjectRepository(PayrollDailyDetail)
    private readonly dailyRepo: Repository<PayrollDailyDetail>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(EmployeeProfile)
    private readonly profileRepo: Repository<EmployeeProfile>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(ShiftAssignment)
    private readonly shiftAssignmentRepo: Repository<ShiftAssignment>,
    @InjectRepository(ShiftWeeklyOff)
    private readonly weeklyOffRepo: Repository<ShiftWeeklyOff>,
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,
    @InjectRepository(Leave)
    private readonly leaveRepo: Repository<Leave>,
    @InjectRepository(PenalizationRecord)
    private readonly penalizationRecordRepo: Repository<PenalizationRecord>,
    @InjectRepository(Compensation)
    private readonly compensationRepo: Repository<Compensation>,
    @InjectRepository(SalaryBreakup)
    private readonly breakupRepo: Repository<SalaryBreakup>,
    private readonly dataSource: DataSource
  ) {}

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Auto-generate previous month's report on the 1st of each month at 03:00.
   */
  @Cron('0 3 1 * *', { name: 'auto-generate-payroll-report' })
  async handleAutoGenerate(): Promise<void> {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    this.logger.log(
      `Auto-generating payroll report for ${prevMonth}/${prevYear}`
    );

    try {
      await this.generateReport(prevMonth, prevYear, null);
      this.logger.log('Auto payroll report generation completed');
    } catch (error) {
      this.logger.error('Auto payroll report generation failed', error);
    }
  }

  async generateReport(
    month: number,
    year: number,
    generatedBy: string | null
  ): Promise<ApiResponse<PayrollReport>> {
    const existing = await this.reportRepo.findOne({
      where: { month, year },
    });
    if (existing) {
      if (existing.status === PayrollReportStatus.FINALIZED) {
        throw new BadRequestException(
          `Payroll report for ${month}/${year} is already finalized`
        );
      }
      await this.detailRepo.delete({ reportId: existing.id });
      await this.reportRepo.remove(existing);
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const activeUsers = await this.userRepo.find({
      where: { isActive: true },
      relations: ['department'],
    });

    const report = this.reportRepo.create({
      month,
      year,
      generatedAt: new Date(),
      generatedBy,
      status: PayrollReportStatus.DRAFT,
      totalEmployees: activeUsers.length,
      totalWorkingDays: 0,
    });

    const savedReport = await this.reportRepo.save(report);

    let maxWorkingDays = 0;

    for (const user of activeUsers) {
      const detail = await this.buildEmployeeDetail(
        savedReport.id,
        user,
        startDate,
        endDate,
        month,
        year,
        lastDay
      );
      if (detail.totalWorkingDays > maxWorkingDays) {
        maxWorkingDays = detail.totalWorkingDays;
      }
    }

    savedReport.totalWorkingDays = maxWorkingDays;
    await this.reportRepo.save(savedReport);

    const result = await this.reportRepo.findOne({
      where: { id: savedReport.id },
      relations: ['details', 'details.user'],
    });

    return {
      success: true,
      message: `Payroll report generated for ${month}/${year}`,
      data: result!,
    };
  }

  private async buildEmployeeDetail(
    reportId: string,
    user: User & { department?: Department },
    startDate: string,
    endDate: string,
    month: number,
    year: number,
    lastDay: number
  ): Promise<PayrollReportDetail> {
    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
    });

    const shiftAssignment = await this.shiftAssignmentRepo.findOne({
      where: {
        userId: user.id,
        isActive: true,
        effectiveFrom: LessThanOrEqual(endDate),
      },
      relations: ['shift', 'shift.weeklyOffs'],
      order: { effectiveFrom: 'DESC' },
    });

    const shift = shiftAssignment?.shift ?? null;
    const weeklyOffs = shift?.weeklyOffs ?? [];
    const weeklyOffDays = new Set(weeklyOffs.map(w => w.dayOfWeek));

    const holidayDates = new Set<string>();
    if (profile?.holidayListId) {
      const holidays = await this.holidayRepo.find({
        where: {
          holidayListId: profile.holidayListId,
          date: Between(startDate, endDate),
        },
      });
      for (const h of holidays) {
        holidayDates.add(h.date);
      }
    }

    const leaves = await this.leaveRepo.find({
      where: {
        userId: user.id,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(endDate),
      },
    });
    const leaveDateMap = new Map<string, Leave>();
    for (const leave of leaves) {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      for (
        let d = new Date(leaveStart);
        d <= leaveEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const ds = this.toDateString(d);
        if (ds >= startDate && ds <= endDate) {
          leaveDateMap.set(ds, leave);
        }
      }
    }

    const attendanceRecords = await this.attendanceRepo.find({
      where: {
        userId: user.id,
        workDate: Between(startDate, endDate),
      },
      relations: ['shift'],
    });
    const attendanceMap = new Map<string, Attendance>();
    for (const a of attendanceRecords) {
      attendanceMap.set(a.workDate, a);
    }

    const penalizationRecords = await this.penalizationRecordRepo.find({
      where: {
        userId: user.id,
        incidentDate: Between(startDate, endDate),
        status: PenalizationRecordStatus.APPLIED,
      },
    });
    const penaltyDateSet = new Set(
      penalizationRecords.map(p => p.incidentDate)
    );
    const totalPenaltyDays = penalizationRecords.reduce(
      (sum, p) => sum + Number(p.deductionDays),
      0
    );

    let totalWorkingDays = 0;
    let totalWeeklyOffDays = 0;
    let totalHolidayDays = 0;
    let totalPresentDays = 0;
    let totalLateDays = 0;
    let totalAbsentDays = 0;
    let totalHalfDays = 0;
    let totalPaidLeaveDays = 0;
    let totalUnpaidLeaveDays = 0;
    let totalWorkedMinutes = 0;
    let totalEffectiveMinutes = 0;
    let totalOvertimeMinutes = 0;

    const dailyDetails: Partial<PayrollDailyDetail>[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = this.toDateString(date);
      const dow = date.getDay();
      const attendance = attendanceMap.get(dateStr);
      const leave = leaveDateMap.get(dateStr);
      const isWeeklyOff = weeklyOffDays.has(dow);
      const isHoliday = holidayDates.has(dateStr);
      const hasPenalty = penaltyDateSet.has(dateStr);

      let dayType: DayType;
      let remarks: string | null = null;

      if (isWeeklyOff) {
        dayType = DayType.WEEKLY_OFF;
        totalWeeklyOffDays++;
      } else if (isHoliday) {
        dayType = DayType.HOLIDAY;
        totalHolidayDays++;
      } else if (leave) {
        dayType = DayType.LEAVE;
        if (leave.leaveType === LeaveType.UNPAID) {
          totalUnpaidLeaveDays += leave.isHalfDay ? 0.5 : 1;
        } else {
          totalPaidLeaveDays += leave.isHalfDay ? 0.5 : 1;
        }
        remarks = `Leave: ${leave.leaveType ?? 'other'}`;
      } else {
        dayType = DayType.WORKING;
        totalWorkingDays++;

        if (attendance) {
          switch (attendance.status) {
            case AttendanceStatus.PRESENT:
              totalPresentDays++;
              break;
            case AttendanceStatus.LATE:
              totalLateDays++;
              totalPresentDays++;
              break;
            case AttendanceStatus.HALF_DAY:
              totalHalfDays++;
              break;
            case AttendanceStatus.ABSENT:
              totalAbsentDays++;
              break;
          }
          totalWorkedMinutes += attendance.totalMinutes ?? 0;
          totalEffectiveMinutes += attendance.effectiveMinutes ?? 0;
          totalOvertimeMinutes += attendance.overtimeMinutes ?? 0;
        } else {
          totalAbsentDays++;
        }
      }

      dailyDetails.push({
        userId: user.id,
        workDate: dateStr,
        dayType,
        punchInAt: attendance?.punchInAt ?? null,
        punchOutAt: attendance?.punchOutAt ?? null,
        totalMinutes: attendance?.totalMinutes ?? null,
        effectiveMinutes: attendance?.effectiveMinutes ?? null,
        lateByMinutes: attendance?.lateByMinutes ?? null,
        earlyLeaveMinutes: attendance?.earlyLeaveMinutes ?? null,
        overtimeMinutes: attendance?.overtimeMinutes ?? null,
        status:
          attendance?.status ?? (dayType === DayType.WORKING ? 'absent' : null),
        shiftName: attendance?.shift?.name ?? shift?.name ?? null,
        isAutoLogout: attendance?.isAutoLogout ?? false,
        penaltyApplied: hasPenalty,
        leaveType: leave?.leaveType ?? null,
        remarks,
      });
    }

    const compensation = await this.compensationRepo.findOne({
      where: { userId: user.id, isActive: true },
      order: { salaryEffectiveFrom: 'DESC' },
    });

    let grossMonthlySalary = 0;
    if (compensation) {
      const breakups = await this.breakupRepo.find({
        where: { compensationId: compensation.id },
      });
      grossMonthlySalary = breakups.reduce(
        (sum, b) => sum + Number(b.monthlyAmount),
        0
      );
      if (grossMonthlySalary === 0) {
        grossMonthlySalary =
          Math.round((Number(compensation.annualSalary) / 12) * 100) / 100;
      }
    }

    const lopDays =
      totalAbsentDays +
      totalUnpaidLeaveDays +
      totalPenaltyDays +
      totalHalfDays * 0.5;

    const netPayableDays = Math.max(
      0,
      totalWorkingDays -
        lopDays +
        totalPaidLeaveDays +
        totalHolidayDays +
        totalWeeklyOffDays
    );

    const calendarDays = lastDay;
    const dailySalary =
      calendarDays > 0 ? grossMonthlySalary / calendarDays : 0;
    const deductions = Math.round(dailySalary * lopDays * 100) / 100;
    const netPayable =
      Math.round((grossMonthlySalary - deductions) * 100) / 100;

    const detail = this.detailRepo.create({
      reportId,
      userId: user.id,
      employeeName: `${user.firstName} ${user.lastName}`.trim(),
      employeeNumber: profile?.employeeNumber ?? null,
      department: user.department?.name ?? null,
      totalWorkingDays,
      totalPresentDays,
      totalLateDays,
      totalAbsentDays,
      totalHalfDays,
      totalPaidLeaveDays,
      totalUnpaidLeaveDays,
      totalWeeklyOffDays,
      totalHolidayDays,
      totalWorkedMinutes,
      totalEffectiveMinutes,
      totalOvertimeMinutes,
      totalPenaltyDeductionDays: totalPenaltyDays,
      lopDays,
      netPayableDays,
      grossMonthlySalary,
      deductions,
      netPayable,
    });

    const savedDetail = await this.detailRepo.save(detail);

    const dailyEntities = dailyDetails.map(d =>
      this.dailyRepo.create({
        ...d,
        reportDetailId: savedDetail.id,
      })
    );

    if (dailyEntities.length > 0) {
      await this.dailyRepo.save(dailyEntities);
    }

    return savedDetail;
  }

  async findAll(): Promise<ApiResponse<PayrollReport[]>> {
    const reports = await this.reportRepo.find({
      order: { year: 'DESC', month: 'DESC' },
    });

    return {
      success: true,
      message: 'Payroll reports retrieved',
      data: reports,
    };
  }

  async findOne(id: string): Promise<ApiResponse<PayrollReport>> {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['details', 'details.user'],
    });

    if (!report) {
      throw new NotFoundException(`Payroll report with ID "${id}" not found`);
    }

    return {
      success: true,
      message: 'Payroll report retrieved',
      data: report,
    };
  }

  async getEmployeeDetail(
    reportId: string,
    userId: string
  ): Promise<ApiResponse<PayrollReportDetail>> {
    const detail = await this.detailRepo.findOne({
      where: { reportId, userId },
      relations: ['dailyDetails', 'user'],
    });

    if (!detail) {
      throw new NotFoundException(
        `Employee detail not found in report "${reportId}"`
      );
    }

    if (detail.dailyDetails) {
      detail.dailyDetails.sort((a, b) => a.workDate.localeCompare(b.workDate));
    }

    return {
      success: true,
      message: 'Employee payroll detail retrieved',
      data: detail,
    };
  }

  async finalizeReport(id: string): Promise<ApiResponse<PayrollReport>> {
    const report = await this.reportRepo.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException(`Payroll report with ID "${id}" not found`);
    }

    if (report.status === PayrollReportStatus.FINALIZED) {
      throw new BadRequestException('Report is already finalized');
    }

    report.status = PayrollReportStatus.FINALIZED;
    const saved = await this.reportRepo.save(report);

    return {
      success: true,
      message: 'Payroll report finalized',
      data: saved,
    };
  }

  async exportCsv(id: string): Promise<string> {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['details'],
    });

    if (!report) {
      throw new NotFoundException(`Payroll report with ID "${id}" not found`);
    }

    const headers = [
      'Employee Name',
      'Employee Number',
      'Department',
      'Working Days',
      'Present Days',
      'Late Days',
      'Half Days',
      'Absent Days',
      'Paid Leave Days',
      'Unpaid Leave Days',
      'Weekly Offs',
      'Holidays',
      'Total Worked Hours',
      'Effective Hours',
      'Overtime Hours',
      'Penalty Deduction Days',
      'LOP Days',
      'Net Payable Days',
      'Gross Monthly Salary',
      'Deductions',
      'Net Payable',
    ];

    const rows = (report.details ?? []).map(d => [
      d.employeeName ?? '',
      d.employeeNumber ?? '',
      d.department ?? '',
      d.totalWorkingDays,
      d.totalPresentDays,
      d.totalLateDays,
      d.totalHalfDays,
      d.totalAbsentDays,
      d.totalPaidLeaveDays,
      d.totalUnpaidLeaveDays,
      d.totalWeeklyOffDays,
      d.totalHolidayDays,
      (d.totalWorkedMinutes / 60).toFixed(2),
      (d.totalEffectiveMinutes / 60).toFixed(2),
      (d.totalOvertimeMinutes / 60).toFixed(2),
      d.totalPenaltyDeductionDays,
      d.lopDays,
      d.netPayableDays,
      d.grossMonthlySalary,
      d.deductions,
      d.netPayable,
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ];

    return csvLines.join('\n');
  }
}
