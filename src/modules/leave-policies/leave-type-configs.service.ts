import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';

import type { CreateLeaveTypeConfigDto } from './dto/create-leave-type-config.dto.js';
import type { UpdateLeaveTypeConfigDto } from './dto/update-leave-type-config.dto.js';
import { LeavePlan } from './entities/leave-plan.entity.js';
import { LeaveTypeConfig } from './entities/leave-type-config.entity.js';

@Injectable()
export class LeaveTypeConfigsService {
  constructor(
    @InjectRepository(LeaveTypeConfig)
    private readonly configRepository: Repository<LeaveTypeConfig>,
    @InjectRepository(LeavePlan)
    private readonly planRepository: Repository<LeavePlan>
  ) {}

  async create(
    planId: string,
    dto: CreateLeaveTypeConfigDto
  ): Promise<ApiResponse<LeaveTypeConfig>> {
    const plan = await this.planRepository.findOne({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException(`Leave plan with ID "${planId}" not found`);
    }

    const existing = await this.configRepository.findOne({
      where: { leavePlanId: planId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Leave type with code "${dto.code}" already exists in this plan`
      );
    }

    const config = this.configRepository.create({
      leavePlanId: planId,
      ...dto,
    });
    const saved = await this.configRepository.save(config);

    return { success: true, message: 'Leave type added', data: saved };
  }

  async update(
    planId: string,
    typeId: string,
    dto: UpdateLeaveTypeConfigDto
  ): Promise<ApiResponse<LeaveTypeConfig>> {
    const config = await this.configRepository.findOne({
      where: { id: typeId, leavePlanId: planId },
    });
    if (!config) {
      throw new NotFoundException(
        `Leave type config with ID "${typeId}" not found in plan "${planId}"`
      );
    }

    if (dto.code && dto.code !== config.code) {
      const existing = await this.configRepository.findOne({
        where: { leavePlanId: planId, code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Leave type with code "${dto.code}" already exists in this plan`
        );
      }
    }

    Object.assign(config, dto);
    const saved = await this.configRepository.save(config);

    return { success: true, message: 'Leave type updated', data: saved };
  }

  async remove(planId: string, typeId: string): Promise<ApiResponse<null>> {
    const config = await this.configRepository.findOne({
      where: { id: typeId, leavePlanId: planId },
    });
    if (!config) {
      throw new NotFoundException(
        `Leave type config with ID "${typeId}" not found in plan "${planId}"`
      );
    }

    config.isActive = false;
    await this.configRepository.save(config);

    return { success: true, message: 'Leave type removed', data: null };
  }
}
