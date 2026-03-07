import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { CreateHolidayDto } from './dto/create-holiday.dto.js';
import { CreateHolidayListDto } from './dto/create-holiday-list.dto.js';
import { UpdateHolidayDto } from './dto/update-holiday.dto.js';
import { UpdateHolidayListDto } from './dto/update-holiday-list.dto.js';
import { Holiday } from './entities/holiday.entity.js';
import { HolidayList } from './entities/holiday-list.entity.js';

@Injectable()
export class HolidayListsService {
  constructor(
    @InjectRepository(HolidayList)
    private readonly listRepo: Repository<HolidayList>,
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>
  ) {}

  async createList(
    dto: CreateHolidayListDto
  ): Promise<ApiResponse<HolidayList>> {
    const entity = this.listRepo.create(dto);
    const saved = await this.listRepo.save(entity);
    return { success: true, message: 'Holiday list created', data: saved };
  }

  async findAllLists(): Promise<ApiResponse<HolidayList[]>> {
    const items = await this.listRepo.find({
      order: { year: 'DESC', name: 'ASC' },
    });
    return { success: true, message: 'Holiday lists retrieved', data: items };
  }

  async findOneList(id: string): Promise<ApiResponse<HolidayList>> {
    const item = await this.listRepo.findOne({
      where: { id },
      relations: ['holidays'],
    });
    if (!item) {
      throw new NotFoundException(`Holiday list with ID "${id}" not found`);
    }
    return { success: true, message: 'Holiday list retrieved', data: item };
  }

  async updateList(
    id: string,
    dto: UpdateHolidayListDto
  ): Promise<ApiResponse<HolidayList>> {
    const item = await this.listRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Holiday list with ID "${id}" not found`);
    }
    Object.assign(item, dto);
    const saved = await this.listRepo.save(item);
    return { success: true, message: 'Holiday list updated', data: saved };
  }

  async removeList(id: string): Promise<ApiResponse<null>> {
    const item = await this.listRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Holiday list with ID "${id}" not found`);
    }
    item.isActive = false;
    await this.listRepo.save(item);
    return { success: true, message: 'Holiday list deactivated', data: null };
  }

  async addHoliday(
    listId: string,
    dto: CreateHolidayDto
  ): Promise<ApiResponse<Holiday>> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`Holiday list with ID "${listId}" not found`);
    }

    const existing = await this.holidayRepo.findOne({
      where: { holidayListId: listId, date: dto.date },
    });
    if (existing) {
      throw new BadRequestException(
        `A holiday already exists on ${dto.date} in this list`
      );
    }

    const holiday = this.holidayRepo.create({
      ...dto,
      holidayListId: listId,
    });
    const saved = await this.holidayRepo.save(holiday);
    return { success: true, message: 'Holiday added', data: saved };
  }

  async updateHoliday(
    listId: string,
    holidayId: string,
    dto: UpdateHolidayDto
  ): Promise<ApiResponse<Holiday>> {
    const holiday = await this.holidayRepo.findOne({
      where: { id: holidayId, holidayListId: listId },
    });
    if (!holiday) {
      throw new NotFoundException(`Holiday not found`);
    }
    Object.assign(holiday, dto);
    const saved = await this.holidayRepo.save(holiday);
    return { success: true, message: 'Holiday updated', data: saved };
  }

  async removeHoliday(
    listId: string,
    holidayId: string
  ): Promise<ApiResponse<null>> {
    const holiday = await this.holidayRepo.findOne({
      where: { id: holidayId, holidayListId: listId },
    });
    if (!holiday) {
      throw new NotFoundException(`Holiday not found`);
    }
    await this.holidayRepo.remove(holiday);
    return { success: true, message: 'Holiday removed', data: null };
  }
}
