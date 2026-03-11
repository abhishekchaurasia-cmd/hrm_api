import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Brackets, MoreThanOrEqual, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    const where: Record<string, unknown> = { isActive: true };
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
      where: { id, isActive: true },
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

    await this.profileRepo
      .createQueryBuilder()
      .update(EmployeeProfile)
      .set({ holidayListId: () => 'NULL' })
      .where('holidayListId = :id', { id })
      .execute();

    await this.listRepo.remove(item);
    return { success: true, message: 'Holiday list deleted', data: null };
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

    const uniqueByDate = new Map<string, (typeof holidaysToImport)[number]>();
    for (const h of holidaysToImport) {
      if (!existingDates.has(h.date) && !uniqueByDate.has(h.date)) {
        uniqueByDate.set(h.date, h);
      }
    }

    const toInsert = Array.from(uniqueByDate.values());
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
    const list = await this.listRepo.findOne({
      where: { id: listId, isActive: true },
    });
    if (!list) {
      throw new NotFoundException(
        `Holiday list with ID "${listId}" not found or inactive`
      );
    }

    const existingProfiles = await this.profileRepo
      .createQueryBuilder('ep')
      .select('ep.userId')
      .where('ep.userId IN (:...employeeIds)', { employeeIds })
      .getMany();

    const usersWithProfiles = new Set(existingProfiles.map(p => p.userId));
    const usersWithoutProfiles = employeeIds.filter(
      id => !usersWithProfiles.has(id)
    );

    if (usersWithoutProfiles.length > 0) {
      const users = await this.userRepo
        .createQueryBuilder('u')
        .where('u.id IN (:...ids)', { ids: usersWithoutProfiles })
        .andWhere('u.isActive = :active', { active: true })
        .getMany();

      if (users.length > 0) {
        const nextSeq = await this.getNextEmployeeSeq('EMP');
        const newProfiles = users.map((u, i) => {
          const num = `EMP-${String(nextSeq + i).padStart(3, '0')}`;
          return this.profileRepo.create({
            userId: u.id,
            employeeNumber: num,
            displayName: `${u.firstName} ${u.lastName}`.trim() || null,
            holidayListId: listId,
          });
        });
        await this.profileRepo.save(newProfiles);
      }
    }

    const updateResult = await this.profileRepo
      .createQueryBuilder()
      .update(EmployeeProfile)
      .set({ holidayListId: listId })
      .where('userId IN (:...employeeIds)', { employeeIds })
      .execute();

    const totalAssigned = updateResult.affected ?? 0;

    if (totalAssigned === 0) {
      throw new BadRequestException(
        'No valid employees found for the provided IDs'
      );
    }

    return {
      success: true,
      message: `${totalAssigned} employees assigned to holiday plan`,
      data: { assigned: totalAssigned },
    };
  }

  private async getNextEmployeeSeq(prefix: string): Promise<number> {
    const profiles = await this.profileRepo
      .createQueryBuilder('p')
      .where('p.employeeNumber LIKE :prefix', { prefix: `${prefix}-%` })
      .orderBy('p.employeeNumber', 'DESC')
      .limit(1)
      .getMany();

    if (profiles.length > 0) {
      const parts = profiles[0].employeeNumber.split('-');
      const numPart = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(numPart)) {
        return numPart + 1;
      }
    }
    return 1;
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
      .set({ holidayListId: () => 'NULL' })
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

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'ep')
      .where('user.isActive = :active', { active: true })
      .andWhere(
        new Brackets(sub => {
          sub
            .where('ep.id IS NULL')
            .orWhere('ep.holidayListId IS NULL')
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

    const users = await qb.getMany();

    const data = users.map(u => ({
      id: u.profile?.id ?? null,
      userId: u.id,
      employeeNumber: u.profile?.employeeNumber ?? null,
      displayName: u.profile?.displayName ?? null,
      user: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      },
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

  async getEmployeeHolidayPlan(
    userId: string
  ): Promise<ApiResponse<Record<string, unknown> | null>> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: ['holidayListId'],
    });

    if (!profile?.holidayListId) {
      return { success: true, message: 'No holiday plan assigned', data: null };
    }

    const list = await this.listRepo.findOne({
      where: { id: profile.holidayListId, isActive: true },
    });

    if (!list) {
      return { success: true, message: 'No holiday plan assigned', data: null };
    }

    const holidayCount = await this.holidayRepo.count({
      where: { holidayListId: list.id },
    });

    return {
      success: true,
      message: 'Holiday plan retrieved',
      data: {
        id: list.id,
        name: list.name,
        year: list.year,
        description: list.description,
        holidayCount,
      },
    };
  }

  async getUpcomingHolidays(
    userId: string,
    limit = 5
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: ['holidayListId'],
    });

    let holidayListId: string | null = profile?.holidayListId ?? null;

    if (!holidayListId) {
      const currentYear = new Date().getFullYear();
      const activeList = await this.listRepo.findOne({
        where: { year: currentYear, isActive: true, isDefault: true },
      });
      holidayListId = activeList?.id ?? null;
    }

    if (!holidayListId) {
      return { success: true, message: 'No upcoming holidays', data: [] };
    }

    const today = new Date().toISOString().split('T')[0];

    const holidays = await this.holidayRepo.find({
      where: {
        holidayListId,
        date: MoreThanOrEqual(today),
      },
      order: { date: 'ASC' },
      take: limit,
    });

    const data = holidays.map(h => ({
      id: h.id,
      name: h.name,
      date: h.date,
      isOptional: h.isOptional,
      isSpecial: h.isSpecial,
    }));

    return { success: true, message: 'Upcoming holidays retrieved', data };
  }

  async getEmployeeHolidayCalendar(
    userId: string,
    year: number
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const result = await this.getEmployeeHolidays(userId, year);
    const holidays = result.data as Array<{
      id: string;
      name: string;
      date: string;
      isOptional: boolean;
      isSpecial: boolean;
    }>;

    const calendar: Record<string, typeof holidays> = {};
    for (const h of holidays) {
      const month = h.date.substring(0, 7);
      if (!calendar[month]) {
        calendar[month] = [];
      }
      calendar[month].push(h);
    }

    return {
      success: true,
      message: 'Holiday calendar retrieved',
      data: {
        year,
        totalHolidays: holidays.length,
        months: calendar,
      },
    };
  }
}
