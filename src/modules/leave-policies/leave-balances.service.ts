import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';

import type { AdjustLeaveBalanceDto } from './dto/adjust-leave-balance.dto.js';
import type { YearEndProcessingDto } from './dto/year-end-processing.dto.js';
import { LeaveBalance } from './entities/leave-balance.entity.js';
import { LeavePlanAssignment } from './entities/leave-plan-assignment.entity.js';
import { LeavePlan } from './entities/leave-plan.entity.js';
import {
  LeaveTransaction,
  LeaveTransactionType,
} from './entities/leave-transaction.entity.js';
import {
  LeaveTypeConfig,
  YearEndAction,
} from './entities/leave-type-config.entity.js';

@Injectable()
export class LeaveBalancesService {
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly balanceRepository: Repository<LeaveBalance>,
    @InjectRepository(LeaveTransaction)
    private readonly transactionRepository: Repository<LeaveTransaction>,
    @InjectRepository(LeavePlanAssignment)
    private readonly assignmentRepository: Repository<LeavePlanAssignment>,
    @InjectRepository(LeaveTypeConfig)
    private readonly typeConfigRepository: Repository<LeaveTypeConfig>,
    @InjectRepository(LeavePlan)
    private readonly planRepository: Repository<LeavePlan>,
    private readonly dataSource: DataSource
  ) {}

  async initializeBalances(
    planId: string,
    currentUser: AuthUser
  ): Promise<ApiResponse<{ created: number; skipped: number }>> {
    const plan = await this.planRepository.findOne({
      where: { id: planId, isActive: true },
      relations: ['leaveTypeConfigs'],
    });
    if (!plan) {
      throw new NotFoundException(`Leave plan with ID "${planId}" not found`);
    }

    const activeConfigs = (plan.leaveTypeConfigs ?? []).filter(c => c.isActive);
    if (activeConfigs.length === 0) {
      throw new BadRequestException(
        'Plan has no active leave type configurations'
      );
    }

    const assignments = await this.assignmentRepository.find({
      where: { leavePlanId: planId, isActive: true },
    });

    let created = 0;
    let skipped = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const assignment of assignments) {
        for (const config of activeConfigs) {
          const existing = await queryRunner.manager.findOne(LeaveBalance, {
            where: {
              userId: assignment.userId,
              leaveTypeConfigId: config.id,
              year: plan.year,
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

          const allocated = config.isUnlimited ? 0 : Number(config.quota);
          const balance = queryRunner.manager.create(LeaveBalance, {
            userId: assignment.userId,
            leaveTypeConfigId: config.id,
            year: plan.year,
            allocated,
            used: 0,
            carriedForward: 0,
            adjusted: 0,
            balance: allocated,
          });
          await queryRunner.manager.save(balance);

          const transaction = queryRunner.manager.create(LeaveTransaction, {
            userId: assignment.userId,
            leaveBalanceId: balance.id,
            transactionType: LeaveTransactionType.ALLOCATION,
            days: allocated,
            previousBalance: 0,
            newBalance: allocated,
            remarks: `Initial allocation for ${config.name} (${plan.name})`,
            performedBy: currentUser.id,
          });
          await queryRunner.manager.save(transaction);

          created++;
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return {
      success: true,
      message: `Balances initialized: ${created} created, ${skipped} skipped`,
      data: { created, skipped },
    };
  }

  async findAll(
    userId?: string,
    planId?: string,
    year?: number
  ): Promise<ApiResponse<LeaveBalance[]>> {
    const qb = this.balanceRepository
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.leaveTypeConfig', 'config')
      .leftJoinAndSelect('config.leavePlan', 'plan')
      .leftJoinAndSelect('balance.user', 'user');

    if (userId) {
      qb.andWhere('balance.userId = :userId', { userId });
    }
    if (planId) {
      qb.andWhere('config.leavePlanId = :planId', { planId });
    }
    if (year) {
      qb.andWhere('balance.year = :year', { year });
    }

    qb.orderBy('user.firstName', 'ASC').addOrderBy('config.name', 'ASC');

    const balances = await qb.getMany();

    return {
      success: true,
      message: 'Leave balances retrieved',
      data: balances,
    };
  }

  async findByEmployee(
    userId: string,
    year?: number
  ): Promise<ApiResponse<LeaveBalance[]>> {
    const where: Record<string, unknown> = { userId };
    if (year) {
      where.year = year;
    }

    const balances = await this.balanceRepository.find({
      where,
      relations: ['leaveTypeConfig'],
      order: { year: 'DESC' },
    });

    return {
      success: true,
      message: 'Employee leave balances retrieved',
      data: balances,
    };
  }

  async adjust(
    dto: AdjustLeaveBalanceDto,
    currentUser: AuthUser
  ): Promise<ApiResponse<LeaveBalance>> {
    const balance = await this.balanceRepository.findOne({
      where: { id: dto.leaveBalanceId },
      relations: ['leaveTypeConfig'],
    });
    if (!balance) {
      throw new NotFoundException(
        `Leave balance with ID "${dto.leaveBalanceId}" not found`
      );
    }

    const previousBalance = Number(balance.balance);
    balance.adjusted = Number(balance.adjusted) + dto.days;
    balance.balance = previousBalance + dto.days;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(balance);

      const transaction = queryRunner.manager.create(LeaveTransaction, {
        userId: balance.userId,
        leaveBalanceId: balance.id,
        transactionType: LeaveTransactionType.ADJUSTMENT,
        days: dto.days,
        previousBalance,
        newBalance: Number(balance.balance),
        remarks: dto.remarks ?? null,
        performedBy: currentUser.id,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return {
      success: true,
      message: 'Leave balance adjusted',
      data: balance,
    };
  }

  async getTransactions(
    userId?: string,
    year?: number
  ): Promise<ApiResponse<LeaveTransaction[]>> {
    const qb = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.leaveBalance', 'balance')
      .leftJoinAndSelect('balance.leaveTypeConfig', 'config')
      .leftJoinAndSelect('tx.user', 'user');

    if (userId) {
      qb.andWhere('tx.userId = :userId', { userId });
    }
    if (year) {
      qb.andWhere('balance.year = :year', { year });
    }

    qb.orderBy('tx.createdAt', 'DESC');

    const transactions = await qb.getMany();

    return {
      success: true,
      message: 'Leave transactions retrieved',
      data: transactions,
    };
  }

  async yearEndProcessing(
    planId: string,
    dto: YearEndProcessingDto,
    currentUser: AuthUser
  ): Promise<ApiResponse<{ processed: number; newBalancesCreated: number }>> {
    if (dto.newYear <= dto.processingYear) {
      throw new BadRequestException(
        'newYear must be greater than processingYear'
      );
    }

    const plan = await this.planRepository.findOne({
      where: { id: planId, isActive: true },
      relations: ['leaveTypeConfigs'],
    });
    if (!plan) {
      throw new NotFoundException(`Leave plan with ID "${planId}" not found`);
    }

    const activeConfigs = (plan.leaveTypeConfigs ?? []).filter(c => c.isActive);

    const assignments = await this.assignmentRepository.find({
      where: { leavePlanId: planId, isActive: true },
    });

    let processed = 0;
    let newBalancesCreated = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const assignment of assignments) {
        for (const config of activeConfigs) {
          const currentBalance = await queryRunner.manager.findOne(
            LeaveBalance,
            {
              where: {
                userId: assignment.userId,
                leaveTypeConfigId: config.id,
                year: dto.processingYear,
              },
            }
          );

          if (!currentBalance) {
            continue;
          }

          const remainingBalance = Number(currentBalance.balance);
          let carryForwardDays = 0;

          switch (config.yearEndAction) {
            case YearEndAction.RESET_TO_ZERO:
              carryForwardDays = 0;
              break;
            case YearEndAction.CARRY_FORWARD_ALL:
              carryForwardDays = Math.max(0, remainingBalance);
              break;
            case YearEndAction.CARRY_FORWARD_LIMITED:
              carryForwardDays = Math.min(
                Math.max(0, remainingBalance),
                Number(config.maxCarryForward ?? 0)
              );
              break;
            case YearEndAction.NONE:
              carryForwardDays = 0;
              break;
          }

          let newBalance = await queryRunner.manager.findOne(LeaveBalance, {
            where: {
              userId: assignment.userId,
              leaveTypeConfigId: config.id,
              year: dto.newYear,
            },
          });

          const newAllocated = config.isUnlimited ? 0 : Number(config.quota);

          if (!newBalance) {
            newBalance = queryRunner.manager.create(LeaveBalance, {
              userId: assignment.userId,
              leaveTypeConfigId: config.id,
              year: dto.newYear,
              allocated: newAllocated,
              used: 0,
              carriedForward: carryForwardDays,
              adjusted: 0,
              balance: newAllocated + carryForwardDays,
            });
            await queryRunner.manager.save(newBalance);
            newBalancesCreated++;
          } else {
            newBalance.carriedForward = carryForwardDays;
            newBalance.balance =
              Number(newBalance.allocated) +
              carryForwardDays +
              Number(newBalance.adjusted) -
              Number(newBalance.used);
            await queryRunner.manager.save(newBalance);
          }

          if (carryForwardDays > 0) {
            const tx = queryRunner.manager.create(LeaveTransaction, {
              userId: assignment.userId,
              leaveBalanceId: newBalance.id,
              transactionType: LeaveTransactionType.CARRY_FORWARD,
              days: carryForwardDays,
              previousBalance: Number(newBalance.balance) - carryForwardDays,
              newBalance: Number(newBalance.balance),
              remarks: `Carry forward from ${dto.processingYear}: ${carryForwardDays} days (${config.name})`,
              performedBy: currentUser.id,
            });
            await queryRunner.manager.save(tx);
          }

          const allocationTx = queryRunner.manager.create(LeaveTransaction, {
            userId: assignment.userId,
            leaveBalanceId: newBalance.id,
            transactionType: LeaveTransactionType.ALLOCATION,
            days: newAllocated,
            previousBalance: carryForwardDays,
            newBalance: Number(newBalance.balance),
            remarks: `Year ${dto.newYear} allocation for ${config.name}`,
            performedBy: currentUser.id,
          });
          await queryRunner.manager.save(allocationTx);

          processed++;
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return {
      success: true,
      message: `Year-end processing complete: ${processed} processed, ${newBalancesCreated} new balances`,
      data: { processed, newBalancesCreated },
    };
  }

  async getBalanceForLeaveType(
    userId: string,
    leaveTypeConfigId: string,
    year: number
  ): Promise<LeaveBalance | null> {
    return this.balanceRepository.findOne({
      where: { userId, leaveTypeConfigId, year },
    });
  }

  async deductBalance(
    userId: string,
    leaveTypeConfigId: string,
    year: number,
    days: number,
    leaveId: string,
    performedBy: string
  ): Promise<void> {
    const balance = await this.balanceRepository.findOne({
      where: { userId, leaveTypeConfigId, year },
    });
    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    const previousBalance = Number(balance.balance);
    balance.used = Number(balance.used) + days;
    balance.balance = previousBalance - days;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(balance);

      const transaction = queryRunner.manager.create(LeaveTransaction, {
        userId,
        leaveBalanceId: balance.id,
        leaveId,
        transactionType: LeaveTransactionType.DEDUCTION,
        days: -days,
        previousBalance,
        newBalance: Number(balance.balance),
        remarks: 'Leave approved - balance deducted',
        performedBy,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reverseBalance(
    userId: string,
    leaveTypeConfigId: string,
    year: number,
    days: number,
    leaveId: string,
    performedBy: string
  ): Promise<void> {
    const balance = await this.balanceRepository.findOne({
      where: { userId, leaveTypeConfigId, year },
    });
    if (!balance) {
      return;
    }

    const previousBalance = Number(balance.balance);
    balance.used = Math.max(0, Number(balance.used) - days);
    balance.balance = previousBalance + days;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(balance);

      const transaction = queryRunner.manager.create(LeaveTransaction, {
        userId,
        leaveBalanceId: balance.id,
        leaveId,
        transactionType: LeaveTransactionType.REVERSAL,
        days,
        previousBalance,
        newBalance: Number(balance.balance),
        remarks: 'Leave cancelled/rejected - balance reversed',
        performedBy,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
