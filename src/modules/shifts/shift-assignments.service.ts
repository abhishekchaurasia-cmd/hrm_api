import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-response.interface.js';
import { paginate } from '../../common/utils/paginate.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { User } from '../users/entities/user.entity.js';

import type { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto.js';
import type { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto.js';
import { ShiftAssignment } from './entities/shift-assignment.entity.js';
import { Shift } from './entities/shift.entity.js';

@Injectable()
export class ShiftAssignmentsService {
  constructor(
    @InjectRepository(ShiftAssignment)
    private readonly assignmentRepository: Repository<ShiftAssignment>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(
    currentUser: AuthUser,
    dto: CreateShiftAssignmentDto
  ): Promise<ApiResponse<ShiftAssignment>> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId, isActive: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }

    const shift = await this.shiftRepository.findOne({
      where: { id: dto.shiftId, isActive: true },
    });
    if (!shift) {
      throw new NotFoundException(`Shift with ID "${dto.shiftId}" not found`);
    }

    if (dto.effectiveTo && dto.effectiveTo < dto.effectiveFrom) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }

    await this.assignmentRepository.update(
      { userId: dto.userId, isActive: true },
      { isActive: false }
    );

    const assignment = this.assignmentRepository.create({
      userId: dto.userId,
      shiftId: dto.shiftId,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo ?? null,
      assignedBy: currentUser.id,
    });

    const saved = await this.assignmentRepository.save(assignment);

    return { success: true, message: 'Shift assigned', data: saved };
  }

  async findAll(
    pagination: PaginationQueryDto,
    userId?: string,
    shiftId?: string
  ): Promise<ApiResponse<PaginatedResult<ShiftAssignment>>> {
    const { page, limit } = pagination;
    const where: Record<string, unknown> = { isActive: true };
    if (userId) {
      where.userId = userId;
    }
    if (shiftId) {
      where.shiftId = shiftId;
    }

    const [items, total] = await this.assignmentRepository.findAndCount({
      where,
      relations: ['user', 'shift'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Shift assignments retrieved',
      data: paginate(items, total, page, limit),
    };
  }

  async findByEmployee(
    userId: string
  ): Promise<ApiResponse<ShiftAssignment | null>> {
    const assignment = await this.assignmentRepository.findOne({
      where: { userId, isActive: true },
      relations: ['shift', 'shift.weeklyOffs'],
    });

    return {
      success: true,
      message: assignment
        ? 'Current shift assignment retrieved'
        : 'No active shift assignment',
      data: assignment,
    };
  }

  async getActiveShiftForUser(
    userId: string,
    date: string
  ): Promise<ShiftAssignment | null> {
    return this.assignmentRepository.findOne({
      where: [
        {
          userId,
          isActive: true,
          effectiveFrom: LessThanOrEqual(date),
          effectiveTo: IsNull(),
        },
        {
          userId,
          isActive: true,
          effectiveFrom: LessThanOrEqual(date),
          effectiveTo: MoreThanOrEqual(date),
        },
      ],
      relations: ['shift', 'shift.weeklyOffs'],
      order: { effectiveFrom: 'DESC' },
    });
  }

  async update(
    id: string,
    dto: UpdateShiftAssignmentDto
  ): Promise<ApiResponse<ShiftAssignment>> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException(`Shift assignment with ID "${id}" not found`);
    }

    if (dto.shiftId) {
      const shift = await this.shiftRepository.findOne({
        where: { id: dto.shiftId, isActive: true },
      });
      if (!shift) {
        throw new NotFoundException(`Shift with ID "${dto.shiftId}" not found`);
      }
      assignment.shiftId = dto.shiftId;
    }

    if (dto.effectiveFrom !== undefined) {
      assignment.effectiveFrom = dto.effectiveFrom;
    }
    if (dto.effectiveTo !== undefined) {
      assignment.effectiveTo = dto.effectiveTo;
    }

    const saved = await this.assignmentRepository.save(assignment);

    return { success: true, message: 'Assignment updated', data: saved };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException(`Shift assignment with ID "${id}" not found`);
    }

    assignment.isActive = false;
    await this.assignmentRepository.save(assignment);

    return { success: true, message: 'Assignment removed', data: null };
  }
}
