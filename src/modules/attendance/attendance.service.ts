import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import type { Shift } from '../shifts/entities/shift.entity.js';
import { ShiftAssignmentsService } from '../shifts/shift-assignments.service.js';
import { User, UserRole } from '../users/entities/user.entity.js';

import { Attendance, AttendanceStatus } from './entities/attendance.entity.js';

export interface TodayAttendanceData {
  workDate: string;
  punchInAt: Date | null;
  punchOutAt: Date | null;
  totalMinutes: number | null;
  status: AttendanceStatus | null;
  shiftId: string | null;
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

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly shiftAssignmentsService: ShiftAssignmentsService
  ) {}

  private getServerNow(): Date {
    return new Date();
  }

  private toWorkDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        status: null,
        shiftId: null,
      };
    }

    return {
      workDate,
      punchInAt: attendance.punchInAt,
      punchOutAt: attendance.punchOutAt,
      totalMinutes: attendance.totalMinutes,
      status: attendance.status,
      shiftId: attendance.shiftId,
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
   * Determine if the punch-in is late based on shift start time and grace period.
   */
  private isLate(punchInAt: Date, shift: Shift): boolean {
    const punchInMinutes = punchInAt.getHours() * 60 + punchInAt.getMinutes();
    const shiftStartMinutes = this.parseTimeToMinutes(shift.startTime);
    return punchInMinutes > shiftStartMinutes + shift.graceMinutes;
  }

  /**
   * Determine attendance status on punch-out based on total worked hours
   * relative to shift's work hours.
   */
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

    const shiftAssignment =
      await this.shiftAssignmentsService.getActiveShiftForUser(
        user.id,
        workDate
      );

    const shift = shiftAssignment?.shift ?? null;
    const late = shift ? this.isLate(now, shift) : false;

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
    if (!existing) {
      attendance.shiftId = shift?.id ?? null;
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

    attendance.punchOutAt = now;
    attendance.totalMinutes = totalMinutes;
    attendance.status = this.determineStatus(totalMinutes, shift, wasLate);

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
}
