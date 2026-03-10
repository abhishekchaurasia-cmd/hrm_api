import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Brackets, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import type { BulkCreateHolidaysDto } from './dto/bulk-create-holidays.dto.js';
import { CreateHolidayDto } from './dto/create-holiday.dto.js';
import { CreateHolidayListDto } from './dto/create-holiday-list.dto.js';
import type { ImportHolidaysDto } from './dto/import-holidays.dto.js';
import { UpdateHolidayDto } from './dto/update-holiday.dto.js';
import { UpdateHolidayListDto } from './dto/update-holiday-list.dto.js';
import { Holiday } from './entities/holiday.entity.js';
import { HolidayList } from './entities/holiday-list.entity.js';
import { PublicHolidaysService } from './public-holidays.service.js';

@Injectable()
export class HolidayListsService {
  constructor(
    @InjectRepository(HolidayList)
    private readonly listRepo: Repository<HolidayList>,
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,
    @InjectRepository(EmployeeProfile)
    private readonly profileRepo: Repository<EmployeeProfile>,
    private readonly publicHolidaysService: PublicHolidaysService
  ) {}

  async createList(
    dto: CreateHolidayListDto
  ): Promise<ApiResponse<HolidayList>> {
    if (dto.isDefault) {
      await this.listRepo.update(
        { year: dto.year, isDefault: true },
        { isDefault: false }
      );
    }
    const entity = this.listRepo.create(dto);
    const saved = await this.listRepo.save(entity);
    return { success: true, message: 'Holiday list created', data: saved };
  }

  async findAllLists(
    year?: number
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    const where: Record<string, unknown> = {};
    if (year) {
      where.year = year;
    }

    const lists = await this.listRepo.find({
      where,
      order: { year: 'DESC', name: 'ASC' },
    });

    const listIds = lists.map(l => l.id);

    const employeeCounts =
      listIds.length > 0
        ? await this.profileRepo
            .createQueryBuilder('ep')
            .select('ep.holidayListId', 'holidayListId')
            .addSelect('COUNT(ep.id)', 'count')
            .where('ep.holidayListId IN (:...listIds)', { listIds })
            .groupBy('ep.holidayListId')
            .getRawMany<{ holidayListId: string; count: string }>()
        : [];

    const holidayCounts =
      listIds.length > 0
        ? await this.holidayRepo
            .createQueryBuilder('h')
            .select('h.holidayListId', 'holidayListId')
            .addSelect('COUNT(h.id)', 'count')
            .where('h.holidayListId IN (:...listIds)', { listIds })
            .groupBy('h.holidayListId')
            .getRawMany<{ holidayListId: string; count: string }>()
        : [];

    const empCountMap = new Map(
      employeeCounts.map(r => [r.holidayListId, parseInt(r.count, 10)])
    );
    const holCountMap = new Map(
      holidayCounts.map(r => [r.holidayListId, parseInt(r.count, 10)])
    );

    const data = lists.map(l => ({
      id: l.id,
      name: l.name,
      year: l.year,
      description: l.description,
      isActive: l.isActive,
      isDefault: l.isDefault,
      employeeCount: empCountMap.get(l.id) ?? 0,
      holidayCount: holCountMap.get(l.id) ?? 0,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));

    return { success: true, message: 'Holiday lists retrieved', data };
  }

  async findOneList(id: string): Promise<ApiResponse<HolidayList>> {
    const item = await this.listRepo.findOne({
      where: { id },
      relations: ['holidays'],
    });
    if (!item) {
      throw new NotFoundException(`Holiday list with ID "${id}" not found`);
    }
    if (item.holidays) {
      item.holidays.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
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

    if (dto.isDefault) {
      const year = dto.year ?? item.year;
      await this.listRepo.update(
        { year, isDefault: true },
        { isDefault: false }
      );
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

  async addBulkHolidays(
    listId: string,
    dto: BulkCreateHolidaysDto
  ): Promise<
    ApiResponse<{ added: number; skipped: number; holidays: Holiday[] }>
  > {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`Holiday list with ID "${listId}" not found`);
    }

    const existingDates = new Set(
      (
        await this.holidayRepo.find({
          where: { holidayListId: listId },
          select: ['date'],
        })
      ).map(h => h.date)
    );

    const toInsert = dto.holidays.filter(h => !existingDates.has(h.date));
    const skipped = dto.holidays.length - toInsert.length;

    const entities = toInsert.map(h =>
      this.holidayRepo.create({ ...h, holidayListId: listId })
    );
    const saved =
      entities.length > 0 ? await this.holidayRepo.save(entities) : [];

    return {
      success: true,
      message: `${saved.length} holidays added, ${skipped} skipped (duplicate dates)`,
      data: { added: saved.length, skipped, holidays: saved },
    };
  }

  async importHolidays(
    listId: string,
    dto: ImportHolidaysDto
  ): Promise<
    ApiResponse<{ added: number; skipped: number; holidays: Holiday[] }>
  > {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`Holiday list with ID "${listId}" not found`);
    }

    let holidaysToImport: Array<{
      name: string;
      date: string;
      isOptional: boolean;
      isSpecial: boolean;
    }>;

    if (dto.selectedHolidays && dto.selectedHolidays.length > 0) {
      const allPublic = await this.publicHolidaysService.getPublicHolidays(
        dto.year,
        dto.countryCode
      );
      const selectedDates = new Set(dto.selectedHolidays.map(h => h.date));
      holidaysToImport = allPublic
        .filter(h => selectedDates.has(h.date))
        .map(h => ({
          name: h.name,
          date: h.date,
          isOptional: h.isOptional,
          isSpecial: h.isSpecial,
        }));
    } else {
      const allPublic = await this.publicHolidaysService.getPublicHolidays(
        dto.year,
        dto.countryCode
      );
      holidaysToImport = allPublic.map(h => ({
        name: h.name,
        date: h.date,
        isOptional: h.isOptional,
        isSpecial: h.isSpecial,
      }));
    }

    const existingDates = new Set(
      (
        await this.holidayRepo.find({
          where: { holidayListId: listId },
          select: ['date'],
        })
      ).map(h => h.date)
    );

    const toInsert = holidaysToImport.filter(h => !existingDates.has(h.date));
    const skipped = holidaysToImport.length - toInsert.length;

    const entities = toInsert.map(h =>
      this.holidayRepo.create({ ...h, holidayListId: listId })
    );
    const saved =
      entities.length > 0 ? await this.holidayRepo.save(entities) : [];

    return {
      success: true,
      message: `${saved.length} holidays imported, ${skipped} skipped (duplicate dates)`,
      data: { added: saved.length, skipped, holidays: saved },
    };
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

  async getListEmployees(
    listId: string
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`Holiday list with ID "${listId}" not found`);
    }

    const profiles = await this.profileRepo.find({
      where: { holidayListId: listId },
      relations: ['user'],
      select: {
        id: true,
        userId: true,
        employeeNumber: true,
        displayName: true,
        user: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    });

    const data = profiles.map(p => ({
      id: p.id,
      userId: p.userId,
      employeeNumber: p.employeeNumber,
      displayName: p.displayName,
      user: p.user
        ? {
            email: p.user.email,
            firstName: p.user.firstName,
            lastName: p.user.lastName,
          }
        : null,
    }));

    return {
      success: true,
      message: 'Employees in holiday list retrieved',
      data,
    };
  }

  async assignEmployees(
    listId: string,
    employeeIds: string[]
  ): Promise<ApiResponse<{ assigned: number }>> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`Holiday list with ID "${listId}" not found`);
    }

    const result = await this.profileRepo
      .createQueryBuilder()
      .update(EmployeeProfile)
      .set({ holidayListId: listId })
      .where('userId IN (:...employeeIds)', { employeeIds })
      .execute();

    return {
      success: true,
      message: `${result.affected ?? 0} employees assigned to holiday plan`,
      data: { assigned: result.affected ?? 0 },
    };
  }

  async unassignEmployees(
    listId: string,
    employeeIds: string[]
  ): Promise<ApiResponse<{ unassigned: number }>> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`Holiday list with ID "${listId}" not found`);
    }

    const result = await this.profileRepo
      .createQueryBuilder()
      .update(EmployeeProfile)
      .set({ holidayListId: null as unknown as string })
      .where('userId IN (:...employeeIds)', { employeeIds })
      .andWhere('holidayListId = :listId', { listId })
      .execute();

    return {
      success: true,
      message: `${result.affected ?? 0} employees unassigned from holiday plan`,
      data: { unassigned: result.affected ?? 0 },
    };
  }

  async getUnassignedEmployees(
    listId: string,
    search?: string
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException(`Holiday list with ID "${listId}" not found`);
    }

    const qb = this.profileRepo
      .createQueryBuilder('ep')
      .leftJoinAndSelect('ep.user', 'user')
      .where(
        new Brackets(sub => {
          sub
            .where('ep.holidayListId IS NULL')
            .orWhere('ep.holidayListId != :listId', { listId });
        })
      );

    if (search) {
      const like = `%${search}%`;
      qb.andWhere(
        new Brackets(sub => {
          sub
            .where('LOWER(user.firstName) LIKE LOWER(:like)', { like })
            .orWhere('LOWER(user.lastName) LIKE LOWER(:like)', { like })
            .orWhere('LOWER(user.email) LIKE LOWER(:like)', { like })
            .orWhere('LOWER(ep.displayName) LIKE LOWER(:like)', { like })
            .orWhere('LOWER(ep.employeeNumber) LIKE LOWER(:like)', { like });
        })
      );
    }

    qb.orderBy('user.firstName', 'ASC').addOrderBy('user.lastName', 'ASC');

    const profiles = await qb.getMany();

    const data = profiles.map(p => ({
      id: p.id,
      userId: p.userId,
      employeeNumber: p.employeeNumber,
      displayName: p.displayName,
      user: p.user
        ? {
            email: p.user.email,
            firstName: p.user.firstName,
            lastName: p.user.lastName,
          }
        : null,
    }));

    return {
      success: true,
      message: 'Unassigned employees retrieved',
      data,
    };
  }

  async getEmployeeHolidays(
    userId: string,
    year: number
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    let holidayListId: string | null = null;

    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: ['holidayListId'],
    });

    if (profile?.holidayListId) {
      holidayListId = profile.holidayListId;
    } else {
      const activeList = await this.listRepo.findOne({
        where: { year, isActive: true },
        order: { createdAt: 'DESC' },
      });
      holidayListId = activeList?.id ?? null;
    }

    if (!holidayListId) {
      return {
        success: true,
        message: 'No holiday list found for the given year',
        data: [],
      };
    }

    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const holidays = await this.holidayRepo.find({
      where: {
        holidayListId,
        date: Between(startOfYear, endOfYear),
      },
      order: { date: 'ASC' },
    });

    const data = holidays.map(h => ({
      id: h.id,
      name: h.name,
      date: h.date,
      isOptional: h.isOptional,
      isSpecial: h.isSpecial,
    }));

    return {
      success: true,
      message: 'Holidays retrieved',
      data,
    };
  }
}
