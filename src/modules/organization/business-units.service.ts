import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto.js';
import { BusinessUnit } from './entities/business-unit.entity.js';

@Injectable()
export class BusinessUnitsService {
  constructor(
    @InjectRepository(BusinessUnit)
    private readonly repo: Repository<BusinessUnit>
  ) {}

  async create(dto: CreateBusinessUnitDto): Promise<ApiResponse<BusinessUnit>> {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return { success: true, message: 'Business unit created', data: saved };
  }

  async findAll(): Promise<ApiResponse<BusinessUnit[]>> {
    const items = await this.repo.find({
      order: { name: 'ASC' },
      relations: ['legalEntity'],
    });
    return { success: true, message: 'Business units retrieved', data: items };
  }

  async findOne(id: string): Promise<ApiResponse<BusinessUnit>> {
    const item = await this.repo.findOne({
      where: { id },
      relations: ['legalEntity'],
    });
    if (!item) {
      throw new NotFoundException(`Business unit with ID "${id}" not found`);
    }
    return { success: true, message: 'Business unit retrieved', data: item };
  }

  async update(
    id: string,
    dto: Partial<CreateBusinessUnitDto>
  ): Promise<ApiResponse<BusinessUnit>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Business unit with ID "${id}" not found`);
    }

    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    return { success: true, message: 'Business unit updated', data: saved };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Business unit with ID "${id}" not found`);
    }
    item.isActive = false;
    await this.repo.save(item);
    return { success: true, message: 'Business unit deactivated', data: null };
  }
}
