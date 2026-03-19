import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-response.interface.js';
import { paginate } from '../../common/utils/paginate.js';

import { CreateShiftDto } from './dto/create-shift.dto.js';
import type { SetWeeklyOffsDto } from './dto/set-weekly-offs.dto.js';
import type { UpdateShiftDto } from './dto/update-shift.dto.js';
import { ShiftWeeklyOff } from './entities/shift-weekly-off.entity.js';
import { Shift } from './entities/shift.entity.js';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(ShiftWeeklyOff)
    private readonly weeklyOffRepository: Repository<ShiftWeeklyOff>
  ) {}

  async create(dto: CreateShiftDto): Promise<ApiResponse<Shift>> {
    const existing = await this.shiftRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Shift with code "${dto.code}" already exists`
      );
    }

    if (dto.isDefault) {
      await this.shiftRepository.update(
        { isDefault: true },
        { isDefault: false }
      );
    }

    const shift = this.shiftRepository.create(dto);
    const saved = await this.shiftRepository.save(shift);

    return { success: true, message: 'Shift created', data: saved };
  }

  async findAll(
    pagination: PaginationQueryDto
  ): Promise<ApiResponse<PaginatedResult<Shift>>> {
    const { page, limit } = pagination;
    const [items, total] = await this.shiftRepository.findAndCount({
      where: { isActive: true },
      relations: ['weeklyOffs'],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Shifts retrieved',
      data: paginate(items, total, page, limit),
    };
  }

  async findOne(id: string): Promise<ApiResponse<Shift>> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: ['weeklyOffs'],
    });
    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }

    return { success: true, message: 'Shift retrieved', data: shift };
  }

  async update(id: string, dto: UpdateShiftDto): Promise<ApiResponse<Shift>> {
    const shift = await this.shiftRepository.findOne({ where: { id } });
    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }

    if (dto.code && dto.code !== shift.code) {
      const existing = await this.shiftRepository.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Shift with code "${dto.code}" already exists`
        );
      }
    }

    if (dto.isDefault) {
      await this.shiftRepository.update(
        { isDefault: true },
        { isDefault: false }
      );
    }

    Object.assign(shift, dto);
    const saved = await this.shiftRepository.save(shift);

    return { success: true, message: 'Shift updated', data: saved };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const shift = await this.shiftRepository.findOne({ where: { id } });
    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }

    shift.isActive = false;
    await this.shiftRepository.save(shift);

    return { success: true, message: 'Shift deactivated', data: null };
  }

  async setWeeklyOffs(
    shiftId: string,
    dto: SetWeeklyOffsDto
  ): Promise<ApiResponse<ShiftWeeklyOff[]>> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
    });
    if (!shift) {
      throw new NotFoundException(`Shift with ID "${shiftId}" not found`);
    }

    const days = dto.weeklyOffs.map(w => w.dayOfWeek);
    if (new Set(days).size !== days.length) {
      throw new BadRequestException('Duplicate day entries are not allowed');
    }

    await this.weeklyOffRepository.delete({ shiftId });

    const entities = dto.weeklyOffs.map(w =>
      this.weeklyOffRepository.create({
        shiftId,
        dayOfWeek: w.dayOfWeek,
        isFullDay: w.isFullDay ?? true,
      })
    );

    const saved = await this.weeklyOffRepository.save(entities);

    return {
      success: true,
      message: 'Weekly offs updated',
      data: saved,
    };
  }
}
