import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { LeaveBalancesService } from '../leave-policies/leave-balances.service.js';
import { LeavePlanAssignmentsService } from '../leave-policies/leave-plan-assignments.service.js';
import { ShiftAssignmentsService } from '../shifts/shift-assignments.service.js';
import { User, UserRole } from '../users/entities/user.entity.js';

import type { ApproveRejectLeaveDto } from './dto/approve-reject-leave.dto.js';
import { CreateLeaveDto } from './dto/create-leave.dto.js';
import type { HrLeavesQueryDto } from './dto/hr-leaves-query.dto.js';
import { ReviewLeaveDto } from './dto/review-leave.dto.js';
import { Leave, LeaveStatus, LeaveType } from './entities/leave.entity.js';

export interface LeaveFilters {
  status?: LeaveStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

@Injectable()
export class LeavesService {
  constructor(
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly balancesService: LeaveBalancesService,
    private readonly planAssignmentsService: LeavePlanAssignmentsService,
    private readonly shiftAssignmentsService: ShiftAssignmentsService
  ) {}

  /**
   * Re-fetch a leave with user (limited fields) and leaveTypeConfig relations.
   * TypeORM loads full user by default; we strip sensitive fields before returning.
   */
  private async findLeaveWithRelations(leaveId: string): Promise<Leave | null> {
    const leave = await this.leaveRepository.findOne({
      where: { id: leaveId },
      relations: ['user', 'leaveTypeConfig'],
    });

    if (leave?.user) {
      const { id, firstName, lastName, email } = leave.user;
      leave.user = { id, firstName, lastName, email } as Leave['user'];
    }
    if (leave?.leaveTypeConfig) {
      const { id, name, code } = leave.leaveTypeConfig;
      leave.leaveTypeConfig = { id, name, code } as Leave['leaveTypeConfig'];
    }

    return leave;
  }

  /**
   * Count working days between two dates, excluding weekly offs from the
   * employee's assigned shift.
   */
  private async calculateWorkingDays(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const shiftAssignment =
      await this.shiftAssignmentsService.getActiveShiftForUser(
        userId,
        startDate
      );

    const weeklyOffDays = new Set<number>();
    if (shiftAssignment?.shift?.weeklyOffs) {
      for (const wo of shiftAssignment.shift.weeklyOffs) {
        weeklyOffDays.add(wo.dayOfWeek);
      }
    }

    let days = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      if (!weeklyOffDays.has(current.getDay())) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return Math.max(days, 0);
  }

  /**
   * Strategy A: balance is deducted immediately on apply.
   */
  async createLeave(
    user: AuthUser,
    dto: CreateLeaveDto
  ): Promise<ApiResponse<Leave>> {
    const isSystemUnpaid = dto.leaveTypeConfigId === 'unpaid';

    if (!dto.leaveType && !dto.leaveTypeConfigId) {
      throw new BadRequestException(
        'Either leaveType or leaveTypeConfigId is required'
      );
    }

    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    let numberOfDays: number;

    if (dto.isHalfDay) {
      if (
        !dto.halfDayType ||
        !['first_half', 'second_half'].includes(dto.halfDayType)
      ) {
        throw new BadRequestException(
          'halfDayType is required and must be "first_half" or "second_half" for half-day leave'
        );
      }
      if (dto.startDate !== dto.endDate) {
        throw new BadRequestException(
          'Half-day leave must be for a single day (startDate must equal endDate)'
        );
      }
      numberOfDays = 0.5;
    } else {
      numberOfDays = await this.calculateWorkingDays(
        user.id,
        dto.startDate,
        dto.endDate
      );

      if (numberOfDays <= 0) {
        throw new BadRequestException(
          'No working days in the selected date range'
        );
      }
    }

    let isUnlimited = false;

    if (isSystemUnpaid) {
      isUnlimited = true;
    } else if (dto.leaveTypeConfigId) {
      const assignment =
        await this.planAssignmentsService.getActiveAssignmentForUser(user.id);

      if (!assignment) {
        throw new BadRequestException('No active leave plan assigned to you');
      }

      const validType = assignment.leavePlan?.leaveTypeConfigs?.find(
        c => c.id === dto.leaveTypeConfigId && c.isActive
      );

      if (!validType) {
        throw new BadRequestException(
          'Invalid leave type for your assigned plan'
        );
      }

      isUnlimited = validType.isUnlimited;

      if (!isUnlimited) {
        const year = new Date(dto.startDate).getFullYear();
        const balance = await this.balancesService.getBalanceForLeaveType(
          user.id,
          dto.leaveTypeConfigId,
          year
        );

        if (!balance || Number(balance.balance) < numberOfDays) {
          throw new BadRequestException(
            `Insufficient leave balance. Available: ${balance ? Number(balance.balance) : 0}, Requested: ${numberOfDays}`
          );
        }
      }
    }

    const leave = this.leaveRepository.create({
      userId: user.id,
      leaveType: isSystemUnpaid ? LeaveType.UNPAID : (dto.leaveType ?? null),
      leaveTypeConfigId: isSystemUnpaid
        ? null
        : (dto.leaveTypeConfigId ?? null),
      startDate: dto.startDate,
      endDate: dto.endDate,
      numberOfDays,
      reason: dto.reason ?? null,
      isHalfDay: dto.isHalfDay ?? false,
      halfDayType: dto.isHalfDay ? (dto.halfDayType ?? null) : null,
      status: LeaveStatus.PENDING,
    });

    const saved = await this.leaveRepository.save(leave);

    if (dto.leaveTypeConfigId && !isUnlimited && !isSystemUnpaid) {
      const year = new Date(dto.startDate).getFullYear();
      await this.balancesService.deductBalance(
        user.id,
        dto.leaveTypeConfigId,
        year,
        numberOfDays,
        saved.id,
        user.id
      );
    }

    return { success: true, message: 'Leave request created', data: saved };
  }

  async getMyLeaves(user: AuthUser): Promise<ApiResponse<Leave[]>> {
    const leaves = await this.leaveRepository.find({
      where: { userId: user.id },
      relations: ['leaveTypeConfig'],
      order: { createdAt: 'DESC' },
    });

    return { success: true, message: 'Leave requests retrieved', data: leaves };
  }

  async getAllLeaves(user: AuthUser): Promise<ApiResponse<Leave[]>> {
    if (user.role !== UserRole.HR) {
      throw new ForbiddenException('Only HR users can access this resource');
    }

    const leaves = await this.leaveRepository.find({
      relations: ['user', 'leaveTypeConfig'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'All leave requests retrieved',
      data: leaves,
    };
  }

  async getPendingLeaves(user: AuthUser): Promise<ApiResponse<Leave[]>> {
    if (user.role !== UserRole.HR) {
      throw new ForbiddenException('Only HR users can access this resource');
    }

    const leaves = await this.leaveRepository.find({
      where: { status: LeaveStatus.PENDING },
      relations: ['user', 'leaveTypeConfig'],
      order: { createdAt: 'ASC' },
    });

    return {
      success: true,
      message: 'Pending leave requests retrieved',
      data: leaves,
    };
  }

  /**
   * Legacy review endpoint. Strategy A: no deduction on approve, restore on reject.
   */
  async reviewLeave(
    reviewer: AuthUser,
    leaveId: string,
    dto: ReviewLeaveDto
  ): Promise<ApiResponse<Leave>> {
    if (reviewer.role !== UserRole.HR) {
      throw new ForbiddenException('Only HR users can review leave requests');
    }

    const leave = await this.leaveRepository.findOne({
      where: { id: leaveId },
    });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Only pending leave requests can be ${dto.status === LeaveStatus.APPROVED ? 'approved' : 'rejected'}`
      );
    }

    leave.status = dto.status;
    leave.reviewedBy = reviewer.id;
    leave.reviewNote = dto.reviewNote ?? null;
    leave.reviewedAt = new Date();

    await this.leaveRepository.save(leave);

    if (
      dto.status === LeaveStatus.REJECTED &&
      leave.leaveTypeConfigId &&
      leave.numberOfDays
    ) {
      const year = new Date(leave.startDate).getFullYear();
      await this.balancesService.reverseBalance(
        leave.userId,
        leave.leaveTypeConfigId,
        year,
        Number(leave.numberOfDays),
        leave.id,
        reviewer.id
      );
    }

    const result = await this.findLeaveWithRelations(leaveId);

    return {
      success: true,
      message: `Leave request ${dto.status}`,
      data: result!,
    };
  }

  async getAvailableLeaveTypes(
    user: AuthUser
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const assignment =
      await this.planAssignmentsService.getActiveAssignmentForUser(user.id);

    const year = new Date().getFullYear();
    let planName: string | null = null;
    let planId: string | null = null;
    const leaveTypes: Array<Record<string, unknown>> = [];

    if (assignment?.leavePlan) {
      planName = assignment.leavePlan.name;
      planId = assignment.leavePlan.id;

      const activeConfigs = (
        assignment.leavePlan.leaveTypeConfigs ?? []
      ).filter(c => c.isActive);

      const configTypes = await Promise.all(
        activeConfigs.map(async config => {
          const balance = await this.balancesService.getBalanceForLeaveType(
            user.id,
            config.id,
            year
          );

          return {
            id: config.id,
            name: config.name,
            code: config.code,
            quota: config.isUnlimited ? null : Number(config.quota),
            isUnlimited: config.isUnlimited,
            isPaid: config.isPaid,
            balance: balance ? Number(balance.balance) : 0,
            used: balance ? Number(balance.used) : 0,
            allocated: balance ? Number(balance.allocated) : 0,
            carriedForward: balance ? Number(balance.carriedForward) : 0,
          };
        })
      );

      leaveTypes.push(...configTypes);
    }

    const hasUnpaidConfig = leaveTypes.some(
      t => t.isPaid === false && t.isUnlimited === true
    );

    if (!hasUnpaidConfig) {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const unpaidUsedResult: { total: string | null } | undefined =
        await this.leaveRepository
          .createQueryBuilder('leave')
          .select('COALESCE(SUM(leave."numberOfDays"), 0)', 'total')
          .where('leave."userId" = :userId', { userId: user.id })
          .andWhere('leave."leaveType" = :lt', { lt: LeaveType.UNPAID })
          .andWhere('leave."startDate" >= :yearStart', { yearStart })
          .andWhere('leave."startDate" <= :yearEnd', { yearEnd })
          .andWhere('leave.status NOT IN (:...excluded)', {
            excluded: [LeaveStatus.CANCELLED, LeaveStatus.REJECTED],
          })
          .getRawOne();

      const unpaidUsed = Number(unpaidUsedResult?.total ?? 0);

      leaveTypes.push({
        id: 'unpaid',
        name: 'Unpaid Leave',
        code: 'UL',
        quota: null,
        isUnlimited: true,
        isPaid: false,
        balance: 0,
        used: unpaidUsed,
        allocated: 0,
        carriedForward: 0,
      });
    }

    return {
      success: true,
      message: 'Available leave types retrieved',
      data: { planName, planId, year, leaveTypes },
    };
  }

  /**
   * Strategy A: balance was deducted on apply, so restore for both pending
   * and approved cancellations.
   */
  async cancelLeave(
    user: AuthUser,
    leaveId: string
  ): Promise<ApiResponse<Leave>> {
    const leave = await this.leaveRepository.findOne({
      where: { id: leaveId, userId: user.id },
    });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (
      leave.status !== LeaveStatus.PENDING &&
      leave.status !== LeaveStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Only pending or approved leave requests can be cancelled'
      );
    }

    leave.status = LeaveStatus.CANCELLED;
    const saved = await this.leaveRepository.save(leave);

    if (leave.leaveTypeConfigId && leave.numberOfDays) {
      const year = new Date(leave.startDate).getFullYear();
      await this.balancesService.reverseBalance(
        leave.userId,
        leave.leaveTypeConfigId,
        year,
        Number(leave.numberOfDays),
        leave.id,
        user.id
      );
    }

    return { success: true, message: 'Leave request cancelled', data: saved };
  }

  async getHrLeaves(
    query: HrLeavesQueryDto
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const qb = this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoin('leave.user', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName', 'user.email'])
      .leftJoin('leave.leaveTypeConfig', 'ltc')
      .addSelect(['ltc.id', 'ltc.name', 'ltc.code']);

    if (query.status) {
      qb.andWhere('leave.status = :status', { status: query.status });
    }
    if (query.userId) {
      qb.andWhere('leave.userId = :userId', { userId: query.userId });
    }
    if (query.startDate) {
      qb.andWhere('leave.startDate >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      qb.andWhere('leave.endDate <= :endDate', { endDate: query.endDate });
    }

    const sortField =
      query.sortBy === 'startDate'
        ? 'leave.startDate'
        : query.sortBy === 'status'
          ? 'leave.status'
          : 'leave.createdAt';

    qb.orderBy(sortField, query.sortOrder === 'asc' ? 'ASC' : 'DESC');
    qb.skip(skip).take(limit);

    const [leaves, total] = await qb.getManyAndCount();

    return {
      success: true,
      message: 'Leave requests retrieved',
      data: {
        leaves,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Strategy A: balance already deducted on apply. No balance change on approval.
   */
  async approveLeave(
    reviewer: AuthUser,
    leaveId: string,
    dto: ApproveRejectLeaveDto
  ): Promise<ApiResponse<Leave>> {
    const leave = await this.leaveRepository.findOne({
      where: { id: leaveId },
    });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be approved'
      );
    }

    leave.status = LeaveStatus.APPROVED;
    leave.reviewedBy = reviewer.id;
    leave.reviewNote = dto.reviewNote ?? null;
    leave.reviewedAt = new Date();

    await this.leaveRepository.save(leave);

    const result = await this.findLeaveWithRelations(leaveId);

    return {
      success: true,
      message: 'Leave request approved',
      data: result!,
    };
  }

  /**
   * Strategy A: balance was deducted on apply, so restore it on rejection.
   */
  async rejectLeave(
    reviewer: AuthUser,
    leaveId: string,
    dto: ApproveRejectLeaveDto
  ): Promise<ApiResponse<Leave>> {
    const leave = await this.leaveRepository.findOne({
      where: { id: leaveId },
    });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be rejected'
      );
    }

    leave.status = LeaveStatus.REJECTED;
    leave.reviewedBy = reviewer.id;
    leave.reviewNote = dto.reviewNote ?? null;
    leave.reviewedAt = new Date();

    await this.leaveRepository.save(leave);

    if (leave.leaveTypeConfigId && leave.numberOfDays) {
      const year = new Date(leave.startDate).getFullYear();
      await this.balancesService.reverseBalance(
        leave.userId,
        leave.leaveTypeConfigId,
        year,
        Number(leave.numberOfDays),
        leave.id,
        reviewer.id
      );
    }

    const result = await this.findLeaveWithRelations(leaveId);

    return {
      success: true,
      message: 'Leave request rejected',
      data: result!,
    };
  }

  async getMyLeavesFiltered(
    user: AuthUser,
    filters: LeaveFilters
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit =
      filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: user.id };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate) {
      where.startDate = MoreThanOrEqual(filters.startDate);
    }
    if (filters.endDate) {
      where.endDate = LessThanOrEqual(filters.endDate);
    }

    const [leaves, total] = await this.leaveRepository.findAndCount({
      where,
      relations: ['leaveTypeConfig'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const countRows: Array<{ status: string; count: string }> =
      await this.leaveRepository
        .createQueryBuilder('leave')
        .select('leave.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('leave.userId = :userId', { userId: user.id })
        .groupBy('leave.status')
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
      message: 'Leave requests retrieved',
      data: {
        leaves,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        statusCounts,
      },
    };
  }

  async getTeamOnLeave(user: AuthUser): Promise<
    ApiResponse<
      Array<{
        userId: string;
        firstName: string;
        lastName: string;
        leaveType: string | null;
        leaveTypeName: string | null;
        startDate: string;
        endDate: string;
        isHalfDay: boolean;
      }>
    >
  > {
    const currentUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: ['id', 'departmentId'],
    });

    if (!currentUser?.departmentId) {
      return {
        success: true,
        message: 'No department assigned',
        data: [],
      };
    }

    const today = new Date().toISOString().split('T')[0];

    const results: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      leaveType: string | null;
      leaveTypeName: string | null;
      startDate: string;
      endDate: string;
      isHalfDay: boolean;
    }> = await this.leaveRepository
      .createQueryBuilder('leave')
      .innerJoin('leave.user', 'u')
      .leftJoin('leave.leaveTypeConfig', 'ltc')
      .select([
        'u.id AS "userId"',
        'u."firstName" AS "firstName"',
        'u."lastName" AS "lastName"',
        'leave."leaveType" AS "leaveType"',
        'ltc.name AS "leaveTypeName"',
        'leave."startDate" AS "startDate"',
        'leave."endDate" AS "endDate"',
        'leave."isHalfDay" AS "isHalfDay"',
      ])
      .where('leave.status = :status', { status: LeaveStatus.APPROVED })
      .andWhere('leave."startDate" <= :today', { today })
      .andWhere('leave."endDate" >= :today', { today })
      .andWhere('u."departmentId" = :deptId', {
        deptId: currentUser.departmentId,
      })
      .andWhere('leave."userId" != :userId', { userId: user.id })
      .getRawMany();

    return {
      success: true,
      message: 'Team on leave retrieved',
      data: results,
    };
  }
}
