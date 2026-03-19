import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';

import {
  Attendance,
  AttendanceStatus,
} from '../attendance/entities/attendance.entity.js';
import { Holiday } from '../holidays/entities/holiday.entity.js';
import { Leave, LeaveStatus } from '../leaves/entities/leave.entity.js';
import { PenalizationPolicyAssignment } from '../penalization-policies/entities/penalization-policy-assignment.entity.js';
import { PenalizationRecordsService } from '../penalization-policies/penalization-records.service.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import type { Shift } from '../shifts/entities/shift.entity.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class AttendanceAutomationService {
  private readonly logger = new Logger(AttendanceAutomationService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(EmployeeProfile)
    private readonly profileRepo: Repository<EmployeeProfile>,
    @InjectRepository(ShiftAssignment)
    private readonly shiftAssignmentRepo: Repository<ShiftAssignment>,
    @InjectRepository(ShiftWeeklyOff)
    private readonly weeklyOffRepo: Repository<ShiftWeeklyOff>,
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,
    @InjectRepository(Leave)
    private readonly leaveRepo: Repository<Leave>,
    @InjectRepository(PenalizationPolicyAssignment)
    private readonly penalizationAssignmentRepo: Repository<PenalizationPolicyAssignment>,
    private readonly penalizationRecordsService: PenalizationRecordsService
  ) {}

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private determineStatus(
    totalMinutes: number,
    shift: Shift | null,
    wasLate: boolean
  ): AttendanceStatus {
    const requiredMinutes = shift ? Number(shift.workHoursPerDay) * 60 : 9 * 60;
    if (totalMinutes >= requiredMinutes) {
      return wasLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    }
    if (totalMinutes >= requiredMinutes / 2) {
      return AttendanceStatus.HALF_DAY;
    }
    return AttendanceStatus.ABSENT;
  }

  /**
   * Auto punch-out at 23:59 daily for employees who forgot to punch out.
   */
  @Cron('59 23 * * *', { name: 'auto-punch-out' })
  async handleAutoPunchOut(): Promise<number> {
    this.logger.log('Running auto punch-out cron job');

    const now = new Date();
    const workDate = this.toDateString(now);

    const openRecords = await this.attendanceRepo.find({
      where: {
        workDate,
        punchInAt: Not(IsNull()),
        punchOutAt: IsNull(),
      },
    });

    if (openRecords.length === 0) {
      this.logger.log('No open attendance records found for auto punch-out');
      return 0;
    }

    const cutoffTime = new Date(now);
    cutoffTime.setHours(23, 59, 0, 0);

    let processed = 0;
    for (const record of openRecords) {
      if (!record.punchInAt) {
        continue;
      }

      const totalMinutes = Math.max(
        0,
        Math.floor((cutoffTime.getTime() - record.punchInAt.getTime()) / 60000)
      );

      let shift: Shift | null = null;
      if (record.shiftId) {
        const assignment = await this.shiftAssignmentRepo.findOne({
          where: { userId: record.userId, isActive: true },
          relations: ['shift'],
        });
        shift = assignment?.shift ?? null;
      }

      const breakMinutes = shift ? shift.breakDurationMinutes : 0;
      const effectiveMinutes = Math.max(0, totalMinutes - breakMinutes);
      const requiredMinutes = shift
        ? Number(shift.workHoursPerDay) * 60
        : 9 * 60;
      const overtimeMinutes = Math.max(0, effectiveMinutes - requiredMinutes);
      const wasLate = record.status === AttendanceStatus.LATE;

      record.punchOutAt = cutoffTime;
      record.totalMinutes = totalMinutes;
      record.effectiveMinutes = effectiveMinutes;
      record.overtimeMinutes = overtimeMinutes;
      record.earlyLeaveMinutes = 0;
      record.isAutoLogout = true;
      record.autoLogoutReason = 'midnight_cutoff';
      record.status = this.determineStatus(totalMinutes, shift, wasLate);

      await this.attendanceRepo.save(record);
      processed++;
    }

    this.logger.log(`Auto punch-out completed: ${processed} records processed`);
    return processed;
  }

  /**
   * Mark absent for employees who didn't punch in on the previous working day.
   * Runs at 01:00, processes the previous day.
   */
  @Cron('0 1 * * *', { name: 'mark-absent' })
  async handleMarkAbsent(): Promise<number> {
    this.logger.log('Running auto absent-marking cron job');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const workDate = this.toDateString(yesterday);
    const dayOfWeek = yesterday.getDay();

    const activeUsers = await this.userRepo.find({
      where: { isActive: true },
      select: ['id'],
    });

    let marked = 0;
    for (const user of activeUsers) {
      const existing = await this.attendanceRepo.findOne({
        where: { userId: user.id, workDate },
      });
      if (existing) {
        continue;
      }

      const isOff = await this.isWeeklyOff(user.id, workDate, dayOfWeek);
      if (isOff) {
        continue;
      }

      const isHoliday = await this.isHoliday(user.id, workDate);
      if (isHoliday) {
        continue;
      }

      const onLeave = await this.isOnApprovedLeave(user.id, workDate);
      if (onLeave) {
        continue;
      }

      const shiftAssignment = await this.shiftAssignmentRepo.findOne({
        where: {
          userId: user.id,
          isActive: true,
          effectiveFrom: LessThanOrEqual(workDate),
        },
        order: { effectiveFrom: 'DESC' },
      });

      const absentRecord = this.attendanceRepo.create({
        userId: user.id,
        workDate,
        shiftId: shiftAssignment?.shiftId ?? null,
        punchInAt: null,
        punchOutAt: null,
        totalMinutes: null,
        effectiveMinutes: null,
        overtimeMinutes: null,
        lateByMinutes: null,
        earlyLeaveMinutes: null,
        status: AttendanceStatus.ABSENT,
        isAutoLogout: false,
        autoLogoutReason: null,
      });

      await this.attendanceRepo.save(absentRecord);
      marked++;
    }

    this.logger.log(
      `Absent marking completed: ${marked} employees marked absent`
    );
    return marked;
  }

  /**
   * Evaluate penalization rules for all employees for the previous day.
   * Runs at 02:00.
   */
  @Cron('0 2 * * *', { name: 'evaluate-penalties' })
  async handleEvaluatePenalties(): Promise<number> {
    this.logger.log('Running auto penalization evaluation cron job');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const workDate = this.toDateString(yesterday);

    const assignments = await this.penalizationAssignmentRepo.find({
      where: { isActive: true },
      select: ['userId'],
    });

    let totalPenalties = 0;
    for (const assignment of assignments) {
      const result =
        await this.penalizationRecordsService.evaluateAndCreatePenalties(
          assignment.userId,
          workDate
        );
      totalPenalties += result.data.length;
    }

    this.logger.log(
      `Penalization evaluation completed: ${totalPenalties} penalties created for ${assignments.length} employees`
    );
    return totalPenalties;
  }

  private async isWeeklyOff(
    userId: string,
    date: string,
    dayOfWeek: number
  ): Promise<boolean> {
    const assignment = await this.shiftAssignmentRepo.findOne({
      where: {
        userId,
        isActive: true,
        effectiveFrom: LessThanOrEqual(date),
      },
      order: { effectiveFrom: 'DESC' },
    });

    if (!assignment) {
      return false;
    }

    const weeklyOff = await this.weeklyOffRepo.findOne({
      where: {
        shiftId: assignment.shiftId,
        dayOfWeek,
      },
    });

    return weeklyOff !== null;
  }

  private async isHoliday(userId: string, date: string): Promise<boolean> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: ['holidayListId'],
    });

    if (!profile?.holidayListId) {
      return false;
    }

    const holiday = await this.holidayRepo.findOne({
      where: {
        holidayListId: profile.holidayListId,
        date,
      },
    });

    return holiday !== null;
  }

  private async isOnApprovedLeave(
    userId: string,
    date: string
  ): Promise<boolean> {
    const leave = await this.leaveRepo.findOne({
      where: {
        userId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(date),
      },
    });

    if (!leave) {
      return false;
    }
    return leave.endDate >= date;
  }
}
