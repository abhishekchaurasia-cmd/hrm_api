import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
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
import type { Shift } from '../shifts/entities/shift.entity.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { ShiftAssignmentsService } from '../shifts/shift-assignments.service.js';
import { TimeTrackingPoliciesService } from '../time-tracking-policies/time-tracking-policies.service.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';

import { Attendance, AttendanceStatus } from './entities/attendance.entity.js';

export interface TodayAttendanceData {
  workDate: string;
  punchInAt: Date | null;
  punchOutAt: Date | null;
  totalMinutes: number | null;
  effectiveMinutes: number | null;
  overtimeMinutes: number | null;
  lateByMinutes: number | null;
  earlyLeaveMinutes: number | null;
  status: AttendanceStatus | null;
  shiftId: string | null;
  isAutoLogout: boolean;
}

export interface AttendanceSummaryData {
  month: number;
  year: number;
  totalDays: number;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  totalWorkedMinutes: number;
  expectedMinutesPerDay: number;
  averageWorkedMinutes: number;
}

export interface HrTodayEmployeeAttendance {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  punchInAt: Date | null;
  punchOutAt: Date | null;
  totalMinutes: number | null;
  status: AttendanceStatus | null;
}

export interface DailyDetailItem {
  date: string;
  dayType: 'working' | 'weekly_off' | 'holiday' | 'leave';
  shift: string | null;
  punchIn: Date | null;
  punchOut: Date | null;
  totalHours: number | null;
  effectiveHours: number | null;
  lateByMinutes: number | null;
  earlyLeaveMinutes: number | null;
  overtimeMinutes: number | null;
  status: string | null;
  isAutoLogout: boolean;
  penaltyApplied: boolean;
  leaveType: string | null;
  remarks: string | null;
}

export interface DetailedAttendanceReport {
  employee: {
    id: string;
    name: string;
    employeeNumber: string | null;
    department: string | null;
    shift: string | null;
  };
  period: {
    month: number;
    year: number;
    totalWorkingDays: number;
    totalCalendarDays: number;
  };
  dailyDetails: DailyDetailItem[];
  summary: {
    presentDays: number;
    lateDays: number;
    absentDays: number;
    halfDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    weeklyOffDays: number;
    holidayDays: number;
    totalWorkedHours: number;
    avgDailyHours: number;
    totalOvertimeHours: number;
    totalPenaltyDays: number;
    lopDays: number;
    netPayableDays: number;
  };
}

export interface MonthlyEmployeeSummary {
  userId: string;
  name: string;
  employeeNumber: string | null;
  department: string | null;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  halfDays: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  lopDays: number;
  netPayableDays: number;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmployeeProfile)
    private readonly profileRepository: Repository<EmployeeProfile>,
    @InjectRepository(ShiftWeeklyOff)
    private readonly weeklyOffRepository: Repository<ShiftWeeklyOff>,
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    @InjectRepository(PenalizationRecord)
    private readonly penalizationRecordRepository: Repository<PenalizationRecord>,
    private readonly shiftAssignmentsService: ShiftAssignmentsService,
    private readonly timeTrackingPoliciesService: TimeTrackingPoliciesService
  ) {}

  private getServerNow(): Date {
    return new Date();
  }

  private toWorkDateString(date: Date): string {
    const tz = process.env.TIMEZONE || 'Asia/Kolkata';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    const d = parts.find(p => p.type === 'day')!.value;
    return `${y}-${m}-${d}`;
  }

  private toTodayData(
    attendance: Attendance | null,
    workDate: string
  ): TodayAttendanceData {
    if (!attendance) {
      return {
        workDate,
        punchInAt: null,
        punchOutAt: null,
        totalMinutes: null,
        effectiveMinutes: null,
        overtimeMinutes: null,
        lateByMinutes: null,
        earlyLeaveMinutes: null,
        status: null,
        shiftId: null,
        isAutoLogout: false,
      };
    }

    return {
      workDate,
      punchInAt: attendance.punchInAt,
      punchOutAt: attendance.punchOutAt,
      totalMinutes: attendance.totalMinutes,
      effectiveMinutes: attendance.effectiveMinutes,
      overtimeMinutes: attendance.overtimeMinutes,
      lateByMinutes: attendance.lateByMinutes,
      earlyLeaveMinutes: attendance.earlyLeaveMinutes,
      status: attendance.status,
      shiftId: attendance.shiftId,
      isAutoLogout: attendance.isAutoLogout,
    };
  }

  /**
   * Parse "HH:mm" time string into total minutes since midnight.
   */
  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Extract hours and minutes from a Date in the configured business timezone,
   * returned as total minutes since midnight. Uses Intl so results are correct
   * regardless of the server's system timezone.
   */
  private getLocalTimeMinutes(date: Date): number {
    const tz = process.env.TIMEZONE || 'Asia/Kolkata';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(date);
    const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
    const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
    return h * 60 + m;
  }

  private isLate(punchInAt: Date, shift: Shift): boolean {
    const punchInMinutes = this.getLocalTimeMinutes(punchInAt);
    const shiftStartMinutes = this.parseTimeToMinutes(shift.startTime);
    return punchInMinutes > shiftStartMinutes + Number(shift.graceMinutes);
  }

  private computeLateByMinutes(punchInAt: Date, shift: Shift): number {
    const punchInMinutes = this.getLocalTimeMinutes(punchInAt);
    const shiftStartMinutes = this.parseTimeToMinutes(shift.startTime);
    const diff = punchInMinutes - shiftStartMinutes;
    return diff > 0 ? diff : 0;
  }

  private computeEarlyLeaveMinutes(punchOutAt: Date, shift: Shift): number {
    const punchOutMinutes = this.getLocalTimeMinutes(punchOutAt);
    const shiftEndMinutes = this.parseTimeToMinutes(shift.endTime);
    const diff = shiftEndMinutes - punchOutMinutes;
    return diff > 0 ? diff : 0;
  }

  private computeEffectiveMinutes(
    totalMinutes: number,
    shift: Shift | null
  ): number {
    const breakMinutes = shift ? shift.breakDurationMinutes : 0;
    return Math.max(0, totalMinutes - breakMinutes);
  }

  private computeOvertimeMinutes(
    effectiveMinutes: number,
    shift: Shift | null
  ): number {
    const requiredMinutes = shift ? Number(shift.workHoursPerDay) * 60 : 9 * 60;
    const diff = effectiveMinutes - requiredMinutes;
    return diff > 0 ? diff : 0;
  }

  /**
   * Determine attendance status on punch-out based on effective worked hours
   * (total minus break) relative to shift's required work hours.
   */
  private determineStatus(
    effectiveMinutes: number,
    shift: Shift | null,
    wasLate: boolean
  ): AttendanceStatus {
    const requiredMinutes = shift ? Number(shift.workHoursPerDay) * 60 : 9 * 60;

    if (effectiveMinutes >= requiredMinutes) {
      return wasLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    }

    if (effectiveMinutes >= requiredMinutes / 2) {
      return AttendanceStatus.HALF_DAY;
    }

    return AttendanceStatus.ABSENT;
  }

  async punchIn(user: AuthUser): Promise<ApiResponse<TodayAttendanceData>> {
    const now = this.getServerNow();
    const workDate = this.toWorkDateString(now);

    const existing = await this.attendanceRepository.findOne({
      where: { userId: user.id, workDate },
    });

    if (existing?.punchInAt && !existing.punchOutAt) {
      throw new BadRequestException('You have already punched in for today');
    }

    if (existing?.punchOutAt) {
      throw new BadRequestException(
        'You have already completed attendance for today'
      );
    }

    const activePolicy =
      await this.timeTrackingPoliciesService.getActivePolicyForUser(user.id);
    if (activePolicy) {
      const { captureSettings } = activePolicy;
      if (
        !captureSettings.webClockIn.enabled &&
        !captureSettings.mobileClockIn.enabled &&
        !captureSettings.remoteClockIn.enabled &&
        !captureSettings.biometricEnabled
      ) {
        throw new BadRequestException(
          'No attendance capture method is enabled for your policy'
        );
      }
    }

    const shiftAssignment =
      await this.shiftAssignmentsService.getActiveShiftForUser(
        user.id,
        workDate
      );

    if (!shiftAssignment) {
      this.logger.warn(
        `No active shift assignment found for user ${user.id} on ${workDate}; late check skipped`
      );
    }

    const shift = shiftAssignment?.shift ?? null;
    const late = shift && !shift.isFlexible ? this.isLate(now, shift) : false;

    const attendance =
      existing ??
      this.attendanceRepository.create({
        userId: user.id,
        workDate,
        shiftId: shift?.id ?? null,
        status: late ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      });

    attendance.punchInAt = now;
    attendance.punchOutAt = null;
    attendance.totalMinutes = null;
    attendance.effectiveMinutes = null;
    attendance.overtimeMinutes = null;
    attendance.earlyLeaveMinutes = null;
    if (!existing) {
      attendance.shiftId = shift?.id ?? null;
    }

    if (shift && !shift.isFlexible) {
      attendance.lateByMinutes = this.computeLateByMinutes(now, shift);
    }

    if (late) {
      attendance.status = AttendanceStatus.LATE;
    }

    const saved = await this.attendanceRepository.save(attendance);

    return {
      success: true,
      message: 'Punch in recorded successfully',
      data: this.toTodayData(saved, workDate),
    };
  }

  async punchOut(user: AuthUser): Promise<ApiResponse<TodayAttendanceData>> {
    const now = this.getServerNow();
    const workDate = this.toWorkDateString(now);

    const attendance = await this.attendanceRepository.findOne({
      where: { userId: user.id, workDate },
    });

    if (!attendance || !attendance.punchInAt) {
      throw new BadRequestException('Punch in is required before punch out');
    }

    if (attendance.punchOutAt) {
      throw new BadRequestException('You have already punched out for today');
    }

    const totalMinutes = Math.max(
      0,
      Math.floor((now.getTime() - attendance.punchInAt.getTime()) / 60000)
    );

    let shift: Shift | null = null;
    if (attendance.shiftId) {
      const shiftAssignment =
        await this.shiftAssignmentsService.getActiveShiftForUser(
          user.id,
          workDate
        );
      shift = shiftAssignment?.shift ?? null;
    }

    const wasLate = attendance.status === AttendanceStatus.LATE;
    const effectiveMinutes = this.computeEffectiveMinutes(totalMinutes, shift);
    const overtimeMinutes = this.computeOvertimeMinutes(
      effectiveMinutes,
      shift
    );
    const earlyLeaveMinutes = shift
      ? this.computeEarlyLeaveMinutes(now, shift)
      : 0;

    attendance.punchOutAt = now;
    attendance.totalMinutes = totalMinutes;
    attendance.effectiveMinutes = effectiveMinutes;
    attendance.overtimeMinutes = overtimeMinutes;
    attendance.earlyLeaveMinutes = earlyLeaveMinutes;
    attendance.status = this.determineStatus(effectiveMinutes, shift, wasLate);

    const saved = await this.attendanceRepository.save(attendance);

    return {
      success: true,
      message: 'Punch out recorded successfully',
      data: this.toTodayData(saved, workDate),
    };
  }

  async getMyTodayAttendance(
    user: AuthUser
  ): Promise<ApiResponse<TodayAttendanceData>> {
    const workDate = this.toWorkDateString(this.getServerNow());

    const attendance = await this.attendanceRepository.findOne({
      where: { userId: user.id, workDate },
    });

    return {
      success: true,
      message: 'Today attendance retrieved',
      data: this.toTodayData(attendance, workDate),
    };
  }

  async getHrTodayAttendance(
    user: AuthUser
  ): Promise<
    ApiResponse<{ workDate: string; employees: HrTodayEmployeeAttendance[] }>
  > {
    if (user.role !== UserRole.HR) {
      throw new ForbiddenException('Only HR users can access this resource');
    }

    const workDate = this.toWorkDateString(this.getServerNow());

    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect(
        'user.attendanceRecords',
        'attendance',
        'attendance.workDate = :workDate',
        { workDate }
      )
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC')
      .getMany();

    const employees = users.map(employee => {
      const attendance = employee.attendanceRecords?.[0] ?? null;
      return {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        punchInAt: attendance?.punchInAt ?? null,
        punchOutAt: attendance?.punchOutAt ?? null,
        totalMinutes: attendance?.totalMinutes ?? null,
        status: attendance?.status ?? null,
      };
    });

    return {
      success: true,
      message: 'Today attendance list retrieved',
      data: { workDate, employees },
    };
  }

  async getMyAttendanceHistory(
    user: AuthUser,
    month: number,
    year: number,
    page: number,
    limit: number
  ): Promise<
    ApiResponse<{
      records: Attendance[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const skip = (page - 1) * limit;

    const [records, total] = await this.attendanceRepository.findAndCount({
      where: {
        userId: user.id,
        workDate: Between(startDate, endDate),
      },
      relations: ['shift'],
      order: { workDate: 'DESC' },
      skip,
      take: limit,
    });

    return {
      success: true,
      message: 'Attendance history retrieved',
      data: {
        records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyAttendanceSummary(
    user: AuthUser,
    month: number,
    year: number
  ): Promise<ApiResponse<AttendanceSummaryData>> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const records = await this.attendanceRepository.find({
      where: {
        userId: user.id,
        workDate: Between(startDate, endDate),
      },
    });

    let present = 0;
    let late = 0;
    let halfDay = 0;
    let absent = 0;
    let totalWorkedMinutes = 0;

    for (const record of records) {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          present++;
          break;
        case AttendanceStatus.LATE:
          late++;
          break;
        case AttendanceStatus.HALF_DAY:
          halfDay++;
          break;
        case AttendanceStatus.ABSENT:
          absent++;
          break;
      }
      if (record.totalMinutes) {
        totalWorkedMinutes += record.totalMinutes;
      }
    }

    const shiftAssignment =
      await this.shiftAssignmentsService.getActiveShiftForUser(
        user.id,
        startDate
      );
    const expectedMinutesPerDay = shiftAssignment?.shift
      ? Number(shiftAssignment.shift.workHoursPerDay) * 60
      : 9 * 60;

    const recordsWithTime = records.filter(r => r.totalMinutes !== null);
    const averageWorkedMinutes =
      recordsWithTime.length > 0
        ? Math.round(totalWorkedMinutes / recordsWithTime.length)
        : 0;

    return {
      success: true,
      message: 'Attendance summary retrieved',
      data: {
        month,
        year,
        totalDays: records.length,
        present,
        late,
        halfDay,
        absent,
        totalWorkedMinutes,
        expectedMinutesPerDay,
        averageWorkedMinutes,
      },
    };
  }

  async getDetailedReport(
    userId: string,
    month: number,
    year: number
  ): Promise<ApiResponse<DetailedAttendanceReport>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const shiftAssignment =
      await this.shiftAssignmentsService.getActiveShiftForUser(userId, endDate);
    const shift = shiftAssignment?.shift ?? null;
    const weeklyOffs = shift?.weeklyOffs ?? [];
    const weeklyOffDays = new Set(weeklyOffs.map(w => w.dayOfWeek));

    const holidayDates = new Set<string>();
    if (profile?.holidayListId) {
      const holidays = await this.holidayRepository.find({
        where: {
          holidayListId: profile.holidayListId,
          date: Between(startDate, endDate),
        },
      });
      for (const h of holidays) {
        holidayDates.add(h.date);
      }
    }

    const leaves = await this.leaveRepository.find({
      where: {
        userId,
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
        const ds = this.toWorkDateString(d);
        if (ds >= startDate && ds <= endDate) {
          leaveDateMap.set(ds, leave);
        }
      }
    }

    const attendanceRecords = await this.attendanceRepository.find({
      where: { userId, workDate: Between(startDate, endDate) },
      relations: ['shift'],
    });
    const attendanceMap = new Map<string, Attendance>();
    for (const a of attendanceRecords) {
      attendanceMap.set(a.workDate, a);
    }

    const penRecords = await this.penalizationRecordRepository.find({
      where: {
        userId,
        incidentDate: Between(startDate, endDate),
      },
    });
    const penaltyDateSet = new Set(
      penRecords
        .filter(p => p.status !== PenalizationRecordStatus.WAIVED)
        .map(p => p.incidentDate)
    );
    const totalPenaltyDays = penRecords
      .filter(p => p.status === PenalizationRecordStatus.APPLIED)
      .reduce((sum, p) => sum + Number(p.deductionDays), 0);

    let totalWorkingDays = 0;
    let weeklyOffCount = 0;
    let holidayCount = 0;
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let totalWorkedMinutes = 0;
    let totalOvertimeMinutes = 0;

    const dailyDetails: DailyDetailItem[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = this.toWorkDateString(date);
      const dow = date.getDay();
      const attendance = attendanceMap.get(dateStr);
      const leave = leaveDateMap.get(dateStr);
      const isWeeklyOff = weeklyOffDays.has(dow);
      const isHoliday = holidayDates.has(dateStr);
      const hasPenalty = penaltyDateSet.has(dateStr);

      let dayType: 'working' | 'weekly_off' | 'holiday' | 'leave';
      let remarks: string | null = null;

      if (isWeeklyOff) {
        dayType = 'weekly_off';
        weeklyOffCount++;
      } else if (isHoliday) {
        dayType = 'holiday';
        holidayCount++;
      } else if (leave) {
        dayType = 'leave';
        const isUnpaid = leave.leaveType === LeaveType.UNPAID;
        if (isUnpaid) {
          unpaidLeaveDays += leave.isHalfDay ? 0.5 : 1;
        } else {
          paidLeaveDays += leave.isHalfDay ? 0.5 : 1;
        }
        remarks = `Leave: ${leave.leaveType ?? 'other'}`;
      } else {
        dayType = 'working';
        totalWorkingDays++;

        if (attendance) {
          switch (attendance.status) {
            case AttendanceStatus.PRESENT:
              presentDays++;
              break;
            case AttendanceStatus.LATE:
              lateDays++;
              presentDays++;
              break;
            case AttendanceStatus.HALF_DAY:
              halfDays++;
              break;
            case AttendanceStatus.ABSENT:
              absentDays++;
              break;
          }
          totalWorkedMinutes += attendance.totalMinutes ?? 0;
          totalOvertimeMinutes += attendance.overtimeMinutes ?? 0;
        } else {
          absentDays++;
        }
      }

      dailyDetails.push({
        date: dateStr,
        dayType,
        shift: attendance?.shift?.name ?? shift?.name ?? null,
        punchIn: attendance?.punchInAt ?? null,
        punchOut: attendance?.punchOutAt ?? null,
        totalHours:
          attendance !== undefined && attendance.totalMinutes !== null
            ? Math.round((attendance.totalMinutes / 60) * 100) / 100
            : null,
        effectiveHours:
          attendance !== undefined && attendance.effectiveMinutes !== null
            ? Math.round((attendance.effectiveMinutes / 60) * 100) / 100
            : null,
        lateByMinutes: attendance?.lateByMinutes ?? null,
        earlyLeaveMinutes: attendance?.earlyLeaveMinutes ?? null,
        overtimeMinutes: attendance?.overtimeMinutes ?? null,
        status: attendance?.status ?? (dayType === 'working' ? 'absent' : null),
        isAutoLogout: attendance?.isAutoLogout ?? false,
        penaltyApplied: hasPenalty,
        leaveType: leave?.leaveType ?? null,
        remarks,
      });
    }

    const lopDays =
      absentDays + unpaidLeaveDays + totalPenaltyDays + halfDays * 0.5;
    const netPayableDays = Math.max(
      0,
      totalWorkingDays - lopDays + paidLeaveDays + holidayCount + weeklyOffCount
    );
    const daysWithTime = attendanceRecords.filter(
      r => r.totalMinutes !== null
    ).length;
    const avgDailyHours =
      daysWithTime > 0
        ? Math.round((totalWorkedMinutes / daysWithTime / 60) * 100) / 100
        : 0;

    const report: DetailedAttendanceReport = {
      employee: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        employeeNumber: profile?.employeeNumber ?? null,
        department:
          (user as User & { department?: { name: string } }).department?.name ??
          null,
        shift: shift?.name ?? null,
      },
      period: {
        month,
        year,
        totalWorkingDays,
        totalCalendarDays: lastDay,
      },
      dailyDetails,
      summary: {
        presentDays,
        lateDays,
        absentDays,
        halfDays,
        paidLeaveDays,
        unpaidLeaveDays,
        weeklyOffDays: weeklyOffCount,
        holidayDays: holidayCount,
        totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        avgDailyHours,
        totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
        totalPenaltyDays,
        lopDays,
        netPayableDays,
      },
    };

    return {
      success: true,
      message: 'Detailed attendance report retrieved',
      data: report,
    };
  }

  async getHrMonthlySummary(
    month: number,
    year: number
  ): Promise<ApiResponse<MonthlyEmployeeSummary[]>> {
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const users = await this.userRepository.find({
      where: { isActive: true },
      relations: ['department'],
    });

    const summaries: MonthlyEmployeeSummary[] = [];

    for (const user of users) {
      const profile = await this.profileRepository.findOne({
        where: { userId: user.id },
      });

      const records = await this.attendanceRepository.find({
        where: { userId: user.id, workDate: Between(startDate, endDate) },
      });

      const shiftAssignment =
        await this.shiftAssignmentsService.getActiveShiftForUser(
          user.id,
          endDate
        );
      const shift = shiftAssignment?.shift ?? null;
      const weeklyOffs = shift?.weeklyOffs ?? [];
      const weeklyOffDays = new Set(weeklyOffs.map(w => w.dayOfWeek));

      let totalWorkingDays = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let totalWorkedMinutes = 0;
      let totalOvertimeMinutes = 0;

      const attendanceMap = new Map<string, Attendance>();
      for (const a of records) {
        attendanceMap.set(a.workDate, a);
      }

      const holidayDates = new Set<string>();
      if (profile?.holidayListId) {
        const holidays = await this.holidayRepository.find({
          where: {
            holidayListId: profile.holidayListId,
            date: Between(startDate, endDate),
          },
        });
        for (const h of holidays) {
          holidayDates.add(h.date);
        }
      }

      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dateStr = this.toWorkDateString(date);
        const dow = date.getDay();

        if (weeklyOffDays.has(dow) || holidayDates.has(dateStr)) {
          continue;
        }

        totalWorkingDays++;
        const attendance = attendanceMap.get(dateStr);

        if (attendance) {
          switch (attendance.status) {
            case AttendanceStatus.PRESENT:
              presentDays++;
              break;
            case AttendanceStatus.LATE:
              lateDays++;
              presentDays++;
              break;
            case AttendanceStatus.HALF_DAY:
              halfDays++;
              break;
            case AttendanceStatus.ABSENT:
              absentDays++;
              break;
          }
          totalWorkedMinutes += attendance.totalMinutes ?? 0;
          totalOvertimeMinutes += attendance.overtimeMinutes ?? 0;
        } else {
          absentDays++;
        }
      }

      const penRecords = await this.penalizationRecordRepository.find({
        where: {
          userId: user.id,
          incidentDate: Between(startDate, endDate),
          status: PenalizationRecordStatus.APPLIED,
        },
      });
      const totalPenaltyDays = penRecords.reduce(
        (sum, p) => sum + Number(p.deductionDays),
        0
      );

      const lopDays = absentDays + totalPenaltyDays + halfDays * 0.5;
      const netPayableDays = Math.max(0, totalWorkingDays - lopDays);

      summaries.push({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        employeeNumber: profile?.employeeNumber ?? null,
        department:
          (user as User & { department?: { name: string } }).department?.name ??
          null,
        presentDays,
        lateDays,
        absentDays,
        halfDays,
        totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
        lopDays,
        netPayableDays,
      });
    }

    return {
      success: true,
      message: 'Monthly attendance summary retrieved',
      data: summaries,
    };
  }
}
