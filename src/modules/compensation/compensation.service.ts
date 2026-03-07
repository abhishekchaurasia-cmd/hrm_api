import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { CreateCompensationDto } from './dto/create-compensation.dto.js';
import { SetSalaryBreakupDto } from './dto/set-salary-breakup.dto.js';
import { UpdateCompensationDto } from './dto/update-compensation.dto.js';
import { Compensation } from './entities/compensation.entity.js';
import { SalaryBreakup } from './entities/salary-breakup.entity.js';

@Injectable()
export class CompensationService {
  constructor(
    @InjectRepository(Compensation)
    private readonly compRepo: Repository<Compensation>,
    @InjectRepository(SalaryBreakup)
    private readonly breakupRepo: Repository<SalaryBreakup>,
    private readonly dataSource: DataSource
  ) {}

  async create(dto: CreateCompensationDto): Promise<ApiResponse<Compensation>> {
    const entity = this.compRepo.create(dto);
    const saved = await this.compRepo.save(entity);
    return { success: true, message: 'Compensation created', data: saved };
  }

  async findByEmployee(userId: string): Promise<ApiResponse<Compensation>> {
    const item = await this.compRepo.findOne({
      where: { userId, isActive: true },
      relations: ['breakups', 'breakups.salaryComponent'],
      order: { salaryEffectiveFrom: 'DESC' },
    });
    if (!item) {
      throw new NotFoundException(
        `Active compensation not found for user "${userId}"`
      );
    }
    return { success: true, message: 'Compensation retrieved', data: item };
  }

  async update(
    id: string,
    dto: UpdateCompensationDto
  ): Promise<ApiResponse<Compensation>> {
    const item = await this.compRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Compensation with ID "${id}" not found`);
    }
    Object.assign(item, dto);
    const saved = await this.compRepo.save(item);
    return { success: true, message: 'Compensation updated', data: saved };
  }

  async getBreakup(id: string): Promise<ApiResponse<SalaryBreakup[]>> {
    const comp = await this.compRepo.findOne({ where: { id } });
    if (!comp) {
      throw new NotFoundException(`Compensation with ID "${id}" not found`);
    }
    const breakups = await this.breakupRepo.find({
      where: { compensationId: id },
      relations: ['salaryComponent'],
      order: { createdAt: 'ASC' },
    });
    return {
      success: true,
      message: 'Salary breakup retrieved',
      data: breakups,
    };
  }

  async setBreakup(
    id: string,
    dto: SetSalaryBreakupDto
  ): Promise<ApiResponse<SalaryBreakup[]>> {
    const comp = await this.compRepo.findOne({ where: { id } });
    if (!comp) {
      throw new NotFoundException(`Compensation with ID "${id}" not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(SalaryBreakup, {
        compensationId: id,
      });

      const breakups: SalaryBreakup[] = [];
      for (const item of dto.breakup) {
        const breakup = queryRunner.manager.create(SalaryBreakup, {
          compensationId: id,
          salaryComponentId: item.salaryComponentId,
          annualAmount: item.annualAmount,
          monthlyAmount: Math.round((item.annualAmount / 12) * 100) / 100,
        });
        breakups.push(breakup);
      }

      const saved = await queryRunner.manager.save(SalaryBreakup, breakups);
      await queryRunner.commitTransaction();

      return { success: true, message: 'Salary breakup set', data: saved };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
