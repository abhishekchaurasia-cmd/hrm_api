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

import type { CreateLeavePlanDto } from './dto/create-leave-plan.dto.js';
import type { UpdateLeavePlanDto } from './dto/update-leave-plan.dto.js';
import { LeavePlan } from './entities/leave-plan.entity.js';

@Injectable()
export class LeavePlansService {
  constructor(
    @InjectRepository(LeavePlan)
    private readonly planRepository: Repository<LeavePlan>
  ) {}

  async create(dto: CreateLeavePlanDto): Promise<ApiResponse<LeavePlan>> {
    if (dto.endDate <= dto.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const plan = this.planRepository.create({
      ...dto,
      description: dto.description ?? null,
    });
    const saved = await this.planRepository.save(plan);

    return { success: true, message: 'Leave plan created', data: saved };
  }

  async findAll(
    pagination: PaginationQueryDto
  ): Promise<ApiResponse<PaginatedResult<LeavePlan>>> {
    const { page, limit } = pagination;
    const [items, total] = await this.planRepository.findAndCount({
      where: { isActive: true },
      relations: ['leaveTypeConfigs'],
      order: { year: 'DESC', name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Leave plans retrieved',
      data: paginate(items, total, page, limit),
    };
  }

  async findOne(id: string): Promise<ApiResponse<LeavePlan>> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['leaveTypeConfigs'],
    });
    if (!plan) {
      throw new NotFoundException(`Leave plan with ID "${id}" not found`);
    }

    return { success: true, message: 'Leave plan retrieved', data: plan };
  }

  async update(
    id: string,
    dto: UpdateLeavePlanDto
  ): Promise<ApiResponse<LeavePlan>> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Leave plan with ID "${id}" not found`);
    }

    Object.assign(plan, dto);
    const saved = await this.planRepository.save(plan);

    return { success: true, message: 'Leave plan updated', data: saved };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Leave plan with ID "${id}" not found`);
    }

    plan.isActive = false;
    await this.planRepository.save(plan);

    return { success: true, message: 'Leave plan deactivated', data: null };
  }
}
