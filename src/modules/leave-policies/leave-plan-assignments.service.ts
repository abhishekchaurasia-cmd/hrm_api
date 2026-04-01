import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-response.interface.js';
import { paginate } from '../../common/utils/paginate.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { User } from '../users/entities/user.entity.js';

import type { CreateLeavePlanAssignmentDto } from './dto/create-leave-plan-assignment.dto.js';
import { LeavePlanAssignment } from './entities/leave-plan-assignment.entity.js';
import { LeavePlan } from './entities/leave-plan.entity.js';

@Injectable()
export class LeavePlanAssignmentsService {
  constructor(
    @InjectRepository(LeavePlanAssignment)
    private readonly assignmentRepository: Repository<LeavePlanAssignment>,
    @InjectRepository(LeavePlan)
    private readonly planRepository: Repository<LeavePlan>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(
    currentUser: AuthUser,
    dto: CreateLeavePlanAssignmentDto
  ): Promise<ApiResponse<LeavePlanAssignment>> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId, isActive: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }

    const plan = await this.planRepository.findOne({
      where: { id: dto.leavePlanId, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException(
        `Leave plan with ID "${dto.leavePlanId}" not found`
      );
    }

    if (dto.effectiveTo && dto.effectiveTo < dto.effectiveFrom) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }

    await this.assignmentRepository.update(
      { userId: dto.userId, leavePlanId: dto.leavePlanId, isActive: true },
      { isActive: false }
    );

    const assignment = this.assignmentRepository.create({
      userId: dto.userId,
      leavePlanId: dto.leavePlanId,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo ?? null,
      assignedBy: currentUser.id,
    });

    const saved = await this.assignmentRepository.save(assignment);

    return { success: true, message: 'Leave plan assigned', data: saved };
  }

  async findAll(
    pagination: PaginationQueryDto,
    userId?: string,
    planId?: string
  ): Promise<ApiResponse<PaginatedResult<LeavePlanAssignment>>> {
    const { page, limit } = pagination;
    const where: Record<string, unknown> = { isActive: true };
    if (userId) {
      where.userId = userId;
    }
    if (planId) {
      where.leavePlanId = planId;
    }

    const [items, total] = await this.assignmentRepository.findAndCount({
      where,
      relations: ['user', 'leavePlan'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Leave plan assignments retrieved',
      data: paginate(items, total, page, limit),
    };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException(
        `Leave plan assignment with ID "${id}" not found`
      );
    }

    assignment.isActive = false;
    await this.assignmentRepository.save(assignment);

    return {
      success: true,
      message: 'Leave plan assignment removed',
      data: null,
    };
  }

  async getActiveAssignmentForUser(
    userId: string
  ): Promise<LeavePlanAssignment | null> {
    return this.assignmentRepository.findOne({
      where: { userId, isActive: true },
      relations: ['leavePlan', 'leavePlan.leaveTypeConfigs'],
      order: { effectiveFrom: 'DESC' },
    });
  }
}
