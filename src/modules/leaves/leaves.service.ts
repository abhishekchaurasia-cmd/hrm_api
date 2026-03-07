import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { LeaveBalancesService } from '../leave-policies/leave-balances.service.js';
import { LeavePlanAssignmentsService } from '../leave-policies/leave-plan-assignments.service.js';
import { ShiftAssignmentsService } from '../shifts/shift-assignments.service.js';
import { UserRole } from '../users/entities/user.entity.js';

import { CreateLeaveDto } from './dto/create-leave.dto.js';
import { ReviewLeaveDto } from './dto/review-leave.dto.js';
import { Leave, LeaveStatus } from './entities/leave.entity.js';

@Injectable()
export class LeavesService {
  constructor(
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    private readonly balancesService: LeaveBalancesService,
    private readonly planAssignmentsService: LeavePlanAssignmentsService,
    private readonly shiftAssignmentsService: ShiftAssignmentsService
  ) {}

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

  async createLeave(
    user: AuthUser,
    dto: CreateLeaveDto
  ): Promise<ApiResponse<Leave>> {
    if (!dto.leaveType && !dto.leaveTypeConfigId) {
      throw new BadRequestException(
        'Either leaveType or leaveTypeConfigId is required'
      );
    }

    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const numberOfDays = await this.calculateWorkingDays(
      user.id,
      dto.startDate,
      dto.endDate
    );

    if (numberOfDays <= 0) {
      throw new BadRequestException(
        'No working days in the selected date range'
      );
    }

    if (dto.leaveTypeConfigId) {
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

      if (!validType.isUnlimited) {
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
      leaveType: dto.leaveType ?? null,
      leaveTypeConfigId: dto.leaveTypeConfigId ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
      numberOfDays,
      reason: dto.reason ?? null,
      status: LeaveStatus.PENDING,
    });

    const saved = await this.leaveRepository.save(leave);

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
      throw new NotFoundException(
        `Leave request with ID "${leaveId}" not found`
      );
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Leave request has already been ${leave.status}`
      );
    }

    leave.status = dto.status;
    leave.reviewedBy = reviewer.id;
    leave.reviewNote = dto.reviewNote ?? null;
    leave.reviewedAt = new Date();

    const saved = await this.leaveRepository.save(leave);

    if (
      dto.status === LeaveStatus.APPROVED &&
      leave.leaveTypeConfigId &&
      leave.numberOfDays
    ) {
      const year = new Date(leave.startDate).getFullYear();
      await this.balancesService.deductBalance(
        leave.userId,
        leave.leaveTypeConfigId,
        year,
        Number(leave.numberOfDays),
        leave.id,
        reviewer.id
      );
    }

    return {
      success: true,
      message: `Leave request ${dto.status}`,
      data: saved,
    };
  }

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

    const wasApproved = leave.status === LeaveStatus.APPROVED;

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

    if (wasApproved && leave.leaveTypeConfigId && leave.numberOfDays) {
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
}
