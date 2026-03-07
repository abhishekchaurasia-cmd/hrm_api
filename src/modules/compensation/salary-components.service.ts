import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto.js';
import { SalaryComponent } from './entities/salary-component.entity.js';

@Injectable()
export class SalaryComponentsService {
  constructor(
    @InjectRepository(SalaryComponent)
    private readonly repo: Repository<SalaryComponent>
  ) {}

  async create(
    dto: CreateSalaryComponentDto
  ): Promise<ApiResponse<SalaryComponent>> {
    const existing = await this.repo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(
        `Salary component with code "${dto.code}" already exists`
      );
    }

    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return { success: true, message: 'Salary component created', data: saved };
  }

  async findAll(): Promise<ApiResponse<SalaryComponent[]>> {
    const items = await this.repo.find({ order: { name: 'ASC' } });
    return {
      success: true,
      message: 'Salary components retrieved',
      data: items,
    };
  }

  async update(
    id: string,
    dto: Partial<CreateSalaryComponentDto>
  ): Promise<ApiResponse<SalaryComponent>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Salary component with ID "${id}" not found`);
    }

    if (dto.code && dto.code !== item.code) {
      const dup = await this.repo.findOne({ where: { code: dto.code } });
      if (dup) {
        throw new BadRequestException(
          `Salary component with code "${dto.code}" already exists`
        );
      }
    }

    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    return { success: true, message: 'Salary component updated', data: saved };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Salary component with ID "${id}" not found`);
    }
    item.isActive = false;
    await this.repo.save(item);
    return {
      success: true,
      message: 'Salary component deactivated',
      data: null,
    };
  }
}
