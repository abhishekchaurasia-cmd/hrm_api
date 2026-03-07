import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { Location } from './entities/location.entity.js';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly repo: Repository<Location>
  ) {}

  async create(dto: CreateLocationDto): Promise<ApiResponse<Location>> {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return { success: true, message: 'Location created', data: saved };
  }

  async findAll(): Promise<ApiResponse<Location[]>> {
    const items = await this.repo.find({ order: { name: 'ASC' } });
    return { success: true, message: 'Locations retrieved', data: items };
  }

  async findOne(id: string): Promise<ApiResponse<Location>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }
    return { success: true, message: 'Location retrieved', data: item };
  }

  async update(
    id: string,
    dto: Partial<CreateLocationDto>
  ): Promise<ApiResponse<Location>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }

    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    return { success: true, message: 'Location updated', data: saved };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }
    item.isActive = false;
    await this.repo.save(item);
    return { success: true, message: 'Location deactivated', data: null };
  }
}
