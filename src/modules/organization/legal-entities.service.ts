import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { CreateLegalEntityDto } from './dto/create-legal-entity.dto.js';
import { LegalEntity } from './entities/legal-entity.entity.js';

@Injectable()
export class LegalEntitiesService {
  constructor(
    @InjectRepository(LegalEntity)
    private readonly repo: Repository<LegalEntity>
  ) {}

  async create(dto: CreateLegalEntityDto): Promise<ApiResponse<LegalEntity>> {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException(
        `Legal entity "${dto.name}" already exists`
      );
    }

    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);

    return { success: true, message: 'Legal entity created', data: saved };
  }

  async findAllOptions(): Promise<ApiResponse<{ id: string; name: string }[]>> {
    const items = await this.repo.find({
      where: { isActive: true },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
    return {
      success: true,
      message: 'Legal entity options retrieved',
      data: items,
    };
  }

  async findAll(): Promise<ApiResponse<LegalEntity[]>> {
    const items = await this.repo.find({ order: { name: 'ASC' } });
    return { success: true, message: 'Legal entities retrieved', data: items };
  }

  async findOne(id: string): Promise<ApiResponse<LegalEntity>> {
    const item = await this.repo.findOne({
      where: { id },
      relations: ['businessUnits'],
    });
    if (!item) {
      throw new NotFoundException(`Legal entity with ID "${id}" not found`);
    }
    return { success: true, message: 'Legal entity retrieved', data: item };
  }

  async update(
    id: string,
    dto: Partial<CreateLegalEntityDto>
  ): Promise<ApiResponse<LegalEntity>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Legal entity with ID "${id}" not found`);
    }

    if (dto.name && dto.name !== item.name) {
      const dup = await this.repo.findOne({ where: { name: dto.name } });
      if (dup) {
        throw new BadRequestException(
          `Legal entity "${dto.name}" already exists`
        );
      }
    }

    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    return { success: true, message: 'Legal entity updated', data: saved };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Legal entity with ID "${id}" not found`);
    }
    item.isActive = false;
    await this.repo.save(item);
    return { success: true, message: 'Legal entity deactivated', data: null };
  }
}
