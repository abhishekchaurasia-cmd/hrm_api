import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import {
  Attendance,
  AttendanceStatus,
} from '../attendance/entities/attendance.entity.js';
import { ShiftAssignmentsService } from '../shifts/shift-assignments.service.js';
import type { Shift } from '../shifts/entities/shift.entity.js';
import { TimeTrackingPoliciesService } from '../time-tracking-policies/time-tracking-policies.service.js';
import type { RegularizationSettings } from '../time-tracking-policies/types/time-tracking-policy.types.js';

import type { ApproveRejectRegularizationDto } from './dto/approve-reject-regularization.dto.js';
import type { CreateRegularizationDto } from './dto/create-regularization.dto.js';
import type { HrRegularizationsQueryDto } from './dto/hr-regularizations-query.dto.js';
import {
  RegularizationRequest,
  RegularizationStatus,
} from './entities/regularization-request.entity.js';

interface RegularizationFilters {
  status?: RegularizationStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class RegularizationsService {
  constructor(
    @InjectRepository(RegularizationRequest)
    private readonly regularizationRepository: Repository<RegularizationRequest>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly timeTrackingPoliciesService: TimeTrackingPoliciesService,
    private readonly shiftAssignmentsService: ShiftAssignmentsService
  ) {}

  private async findWithRelations(
    id: string
  ): Promise<RegularizationRequest | null> {
    const request = await this.regularizationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (request?.user) {
      const { id: uid, firstName, lastName, email } = request.user;
      request.user = {
        id: uid,
        firstName,
        lastName,
        email,
      } as RegularizationRequest['user'];
    }

    return request;
  }

  private getWeekBounds(date: Date): { start: string; end: string } {
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: this.toDateString(monday),
      end: this.toDateString(sunday),
    };
  }

  private getMonthBounds(date: Date): { start: string; end: string } {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      end: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }

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
    requiredMinutes: number,
    wasLate: boolean
  ): AttendanceStatus {
    if (totalMinutes >= requiredMinutes) {
      return wasLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    }
    if (totalMinutes >= requiredMinutes / 2) {
      return AttendanceStatus.HALF_DAY;
    }
    return AttendanceStatus.ABSENT;
  }

  async create(
    user: AuthUser,
    dto: CreateRegularizationDto
  ): Promise<ApiResponse<RegularizationRequest>> {
    const policy =
      await this.timeTrackingPoliciesService.getActivePolicyForUser(user.id);

    if (!policy) {
      throw new BadRequestException(
        'No time tracking policy assigned. Cannot submit regularization.'
      );
    }

    const settings: RegularizationSettings = policy.regularizationSettings;

    if (!settings.enabled) {
      throw new BadRequestException(
        'Regularization is not enabled in your time tracking policy'
      );
    }

    const requestDate = new Date(dto.requestDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate >= today) {
      throw new BadRequestException(
        'Regularization can only be requested for past dates'
      );
    }

    const daysDiff = Math.floor(
      (today.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > settings.pastDaysLimit) {
      throw new BadRequestException(
        `Regularization request date exceeds the allowed past days limit of ${settings.pastDaysLimit} days`
      );
    }

    const requestDayOfMonth = requestDate.getDate();
    if (requestDayOfMonth > settings.lastDateOfMonth) {
      throw new BadRequestException(
        `Regularization is not allowed for dates after the ${settings.lastDateOfMonth}th of the month`
      );
    }

    const bounds =
      settings.period === 'week'
        ? this.getWeekBounds(today)
        : this.getMonthBounds(today);

    const existingCount = await this.regularizationRepository.count({
      where: {
        userId: user.id,
        createdAt: Between(
          new Date(bounds.start),
          new Date(bounds.end + 'T23:59:59.999Z')
        ),
        status: RegularizationStatus.PENDING,
      },
    });

    const approvedCount = await this.regularizationRepository.count({
      where: {
        userId: user.id,
        createdAt: Between(
          new Date(bounds.start),
          new Date(bounds.end + 'T23:59:59.999Z')
        ),
        status: RegularizationStatus.APPROVED,
      },
    });

    if (existingCount + approvedCount >= settings.entries) {
      throw new BadRequestException(
        `You have reached the maximum of ${settings.entries} regularization requests per ${settings.period}`
      );
    }

    if (
      settings.reasonRequired &&
      (!dto.reason || dto.reason.trim().length === 0)
    ) {
      throw new BadRequestException(
        'Reason is required for regularization requests'
      );
    }

    const punchIn = new Date(dto.requestedPunchIn);
    const punchOut = new Date(dto.requestedPunchOut);

    if (punchOut <= punchIn) {
      throw new BadRequestException(
        'Requested punch-out must be after requested punch-in'
      );
    }

    const existingAttendance = await this.attendanceRepository.findOne({
      where: { userId: user.id, workDate: dto.requestDate },
    });

    const duplicateRequest = await this.regularizationRepository.findOne({
      where: {
        userId: user.id,
        requestDate: dto.requestDate,
        status: RegularizationStatus.PENDING,
      },
    });

    if (duplicateRequest) {
      throw new BadRequestException(
        'You already have a pending regularization request for this date'
      );
    }

    const request = this.regularizationRepository.create({
      userId: user.id,
      attendanceId: existingAttendance?.id ?? null,
      requestDate: dto.requestDate,
      originalPunchIn: existingAttendance?.punchInAt ?? null,
      originalPunchOut: existingAttendance?.punchOutAt ?? null,
      requestedPunchIn: punchIn,
      requestedPunchOut: punchOut,
      reason: dto.reason ?? null,
      requestType: dto.requestType,
      status: RegularizationStatus.PENDING,
    });

    const saved = await this.regularizationRepository.save(request);

    return {
      success: true,
      message: 'Regularization request submitted',
      data: saved,
    };
  }

  async getMyRegularizations(
    user: AuthUser,
    filters: RegularizationFilters
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit =
      filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: user.id };
    if (filters.status) {
      where.status = filters.status;
    }

    const [requests, total] = await this.regularizationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const countRows: Array<{ status: string; count: string }> =
      await this.regularizationRepository
        .createQueryBuilder('reg')
        .select('reg.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('reg.userId = :userId', { userId: user.id })
        .groupBy('reg.status')
        .getRawMany();

    const statusCounts: Record<string, number> = {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    for (const row of countRows) {
      const c = parseInt(row.count, 10);
      statusCounts[row.status] = c;
      statusCounts.all += c;
    }

    return {
      success: true,
      message: 'Regularization requests retrieved',
      data: {
        requests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        statusCounts,
      },
    };
  }

  async getRemainingEntries(
    user: AuthUser
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const policy =
      await this.timeTrackingPoliciesService.getActivePolicyForUser(user.id);

    if (!policy || !policy.regularizationSettings.enabled) {
      return {
        success: true,
        message: 'Regularization info retrieved',
        data: {
          enabled: false,
          remaining: 0,
          total: 0,
          period: 'month',
          used: 0,
        },
      };
    }

    const settings = policy.regularizationSettings;
    const today = new Date();

    const bounds =
      settings.period === 'week'
        ? this.getWeekBounds(today)
        : this.getMonthBounds(today);

    const usedCount = await this.regularizationRepository.count({
      where: [
        {
          userId: user.id,
          createdAt: Between(
            new Date(bounds.start),
            new Date(bounds.end + 'T23:59:59.999Z')
          ),
          status: RegularizationStatus.PENDING,
        },
        {
          userId: user.id,
          createdAt: Between(
            new Date(bounds.start),
            new Date(bounds.end + 'T23:59:59.999Z')
          ),
          status: RegularizationStatus.APPROVED,
        },
      ],
    });

    return {
      success: true,
      message: 'Remaining regularization entries retrieved',
      data: {
        enabled: true,
        remaining: Math.max(0, settings.entries - usedCount),
        total: settings.entries,
        period: settings.period,
        used: usedCount,
        pastDaysLimit: settings.pastDaysLimit,
        lastDateOfMonth: settings.lastDateOfMonth,
        reasonRequired: settings.reasonRequired,
      },
    };
  }

  async getHrRegularizations(
    query: HrRegularizationsQueryDto
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const qb = this.regularizationRepository
      .createQueryBuilder('reg')
      .leftJoin('reg.user', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName', 'user.email']);

    if (query.status) {
      qb.andWhere('reg.status = :status', { status: query.status });
    }
    if (query.userId) {
      qb.andWhere('reg.userId = :userId', { userId: query.userId });
    }
    if (query.startDate) {
      qb.andWhere('reg.requestDate >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      qb.andWhere('reg.requestDate <= :endDate', { endDate: query.endDate });
    }

    const sortField =
      query.sortBy === 'requestDate'
        ? 'reg.requestDate'
        : query.sortBy === 'status'
          ? 'reg.status'
          : 'reg.createdAt';

    qb.orderBy(sortField, query.sortOrder === 'asc' ? 'ASC' : 'DESC');
    qb.skip(skip).take(limit);

    const [requests, total] = await qb.getManyAndCount();

    const pendingCount = await this.regularizationRepository.count({
      where: { status: RegularizationStatus.PENDING },
    });

    return {
      success: true,
      message: 'Regularization requests retrieved',
      data: {
        requests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        pendingCount,
      },
    };
  }

  async approve(
    reviewer: AuthUser,
    requestId: string,
    dto: ApproveRejectRegularizationDto
  ): Promise<ApiResponse<RegularizationRequest>> {
    const request = await this.regularizationRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Regularization request not found');
    }

    if (request.status !== RegularizationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending regularization requests can be approved'
      );
    }

    let attendance = await this.attendanceRepository.findOne({
      where: { userId: request.userId, workDate: request.requestDate },
    });

    if (!attendance) {
      attendance = this.attendanceRepository.create({
        userId: request.userId,
        workDate: request.requestDate,
        shiftId: null,
      });
    }

    const shiftAssignment =
      await this.shiftAssignmentsService.getActiveShiftForUser(
        request.userId,
        request.requestDate
      );
    const shift: Shift | null = shiftAssignment?.shift ?? null;

    attendance.punchInAt = request.requestedPunchIn;
    attendance.punchOutAt = request.requestedPunchOut;
    attendance.shiftId = shift?.id ?? attendance.shiftId ?? null;

    const totalMinutes = Math.max(
      0,
      Math.floor(
        (request.requestedPunchOut.getTime() -
          request.requestedPunchIn.getTime()) /
          60000
      )
    );
    attendance.totalMinutes = totalMinutes;

    const breakMinutes = shift ? shift.breakDurationMinutes : 0;
    const effectiveMinutes = Math.max(0, totalMinutes - breakMinutes);
    const requiredMinutes = shift ? Number(shift.workHoursPerDay) * 60 : 9 * 60;
    const overtimeMinutes = Math.max(0, effectiveMinutes - requiredMinutes);

    attendance.effectiveMinutes = effectiveMinutes;
    attendance.overtimeMinutes = overtimeMinutes;

    let lateByMinutes = 0;
    let earlyLeaveMinutes = 0;
    let wasLate = false;

    if (shift) {
      const punchInMinutes =
        request.requestedPunchIn.getHours() * 60 +
        request.requestedPunchIn.getMinutes();
      const shiftStartMinutes = this.parseTimeToMinutes(shift.startTime);
      lateByMinutes = Math.max(0, punchInMinutes - shiftStartMinutes);
      wasLate = punchInMinutes > shiftStartMinutes + shift.graceMinutes;

      const punchOutMinutes =
        request.requestedPunchOut.getHours() * 60 +
        request.requestedPunchOut.getMinutes();
      const shiftEndMinutes = this.parseTimeToMinutes(shift.endTime);
      earlyLeaveMinutes = Math.max(0, shiftEndMinutes - punchOutMinutes);
    }

    attendance.lateByMinutes = lateByMinutes;
    attendance.earlyLeaveMinutes = earlyLeaveMinutes;
    attendance.status = this.determineStatus(
      totalMinutes,
      requiredMinutes,
      wasLate
    );

    await this.attendanceRepository.save(attendance);

    request.attendanceId = attendance.id;
    request.status = RegularizationStatus.APPROVED;
    request.reviewedBy = reviewer.id;
    request.reviewNote = dto.reviewNote ?? null;
    request.reviewedAt = new Date();

    await this.regularizationRepository.save(request);

    const result = await this.findWithRelations(requestId);

    return {
      success: true,
      message: 'Regularization request approved',
      data: result!,
    };
  }

  async reject(
    reviewer: AuthUser,
    requestId: string,
    dto: ApproveRejectRegularizationDto
  ): Promise<ApiResponse<RegularizationRequest>> {
    const request = await this.regularizationRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Regularization request not found');
    }

    if (request.status !== RegularizationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending regularization requests can be rejected'
      );
    }

    request.status = RegularizationStatus.REJECTED;
    request.reviewedBy = reviewer.id;
    request.reviewNote = dto.reviewNote ?? null;
    request.reviewedAt = new Date();

    await this.regularizationRepository.save(request);

    const result = await this.findWithRelations(requestId);

    return {
      success: true,
      message: 'Regularization request rejected',
      data: result!,
    };
  }

  async cancel(
    user: AuthUser,
    requestId: string
  ): Promise<ApiResponse<RegularizationRequest>> {
    const request = await this.regularizationRepository.findOne({
      where: { id: requestId, userId: user.id },
    });

    if (!request) {
      throw new NotFoundException('Regularization request not found');
    }

    if (request.status !== RegularizationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending regularization requests can be cancelled'
      );
    }

    request.status = RegularizationStatus.CANCELLED;
    const saved = await this.regularizationRepository.save(request);

    return {
      success: true,
      message: 'Regularization request cancelled',
      data: saved,
    };
  }
}
