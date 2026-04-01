import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Compensation } from '../compensation/entities/compensation.entity.js';
import { SalaryBreakup } from '../compensation/entities/salary-breakup.entity.js';
import { LeaveBalance } from '../leave-policies/entities/leave-balance.entity.js';
import { LeavePlanAssignment } from '../leave-policies/entities/leave-plan-assignment.entity.js';
import { LeavePlan } from '../leave-policies/entities/leave-plan.entity.js';
import {
  LeaveTransaction,
  LeaveTransactionType,
} from '../leave-policies/entities/leave-transaction.entity.js';
import { HolidayList } from '../holidays/entities/holiday-list.entity.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { Shift } from '../shifts/entities/shift.entity.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import type { OnboardEmployeeDto } from './dto/onboard-employee.dto.js';

export interface OnboardingResult {
  user: { id: string; email: string; firstName: string; lastName: string };
  profile: { id: string; employeeNumber: string };
  shiftAssignment?: { id: string; shiftId: string };
  leavePlanAssignment?: { id: string; leavePlanId: string };
  holidayListAssignment?: { id: string; holidayListId: string; name: string };
  compensation?: { id: string; annualSalary: number };
}

@Injectable()
export class EmployeeOnboardingService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(EmployeeProfile)
    private readonly profileRepo: Repository<EmployeeProfile>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService
  ) {}

  async onboard(
    currentUser: AuthUser,
    dto: OnboardEmployeeDto
  ): Promise<ApiResponse<OnboardingResult>> {
    const { basicDetails, jobDetails, moreDetails, compensation } = dto;

    const existingUser = await this.userRepo.findOne({
      where: { email: basicDetails.email },
    });
    if (existingUser) {
      throw new BadRequestException(
        'An account with this email already exists'
      );
    }

    const employeeNumber = await this.resolveEmployeeNumber(
      basicDetails.employeeNumber,
      basicDetails.numberSeries
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Create User
      const rounds = this.configService.get<number>(
        'security.bcryptRounds',
        12
      );
      const passwordHash = await bcrypt.hash(basicDetails.password, rounds);

      const user = queryRunner.manager.create(User, {
        email: basicDetails.email,
        firstName: basicDetails.firstName,
        lastName: basicDetails.lastName,
        passwordHash,
        role: UserRole.EMPLOYEE,
        departmentId: jobDetails?.departmentId ?? null,
      });
      const savedUser = await queryRunner.manager.save(User, user);

      // Step 2: Create Employee Profile
      const profile = queryRunner.manager.create(EmployeeProfile, {
        userId: savedUser.id,
        middleName: basicDetails.middleName ?? null,
        displayName: basicDetails.displayName ?? null,
        gender: basicDetails.gender ?? null,
        dateOfBirth: basicDetails.dateOfBirth ?? null,
        nationality: basicDetails.nationality ?? null,
        workCountry: basicDetails.workCountry ?? null,
        employeeNumber,
        numberSeries: basicDetails.numberSeries ?? null,
        mobileNumber: basicDetails.mobileNumber ?? null,
        joiningDate: jobDetails?.joiningDate ?? null,
        jobTitle: jobDetails?.jobTitle ?? null,
        secondaryJobTitle: jobDetails?.secondaryJobTitle ?? null,
        timeType: jobDetails?.timeType,
        workerType: jobDetails?.workerType ?? null,
        reportingManagerId: jobDetails?.reportingManagerId ?? null,
        dottedLineManagerId: jobDetails?.dottedLineManagerId ?? null,
        legalEntityId: jobDetails?.legalEntityId ?? null,
        businessUnitId: jobDetails?.businessUnitId ?? null,
        locationId: jobDetails?.locationId ?? null,
        probationPolicyMonths: jobDetails?.probationPolicyMonths ?? null,
        noticePeriodDays: jobDetails?.noticePeriodDays ?? null,
        inviteToLogin: moreDetails?.inviteToLogin ?? false,
        enableOnboardingFlow: moreDetails?.enableOnboardingFlow ?? false,
        holidayListId: moreDetails?.holidayListId ?? null,
        attendanceNumber: moreDetails?.attendanceNumber ?? null,
      });
      const savedProfile = await queryRunner.manager.save(
        EmployeeProfile,
        profile
      );

      const result: OnboardingResult = {
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
        },
        profile: {
          id: savedProfile.id,
          employeeNumber: savedProfile.employeeNumber,
        },
      };

      // Step 2b: Validate Holiday List assignment
      if (moreDetails?.holidayListId) {
        const holidayList = await queryRunner.manager.findOne(HolidayList, {
          where: { id: moreDetails.holidayListId, isActive: true },
        });
        if (!holidayList) {
          throw new BadRequestException(
            `Holiday list with ID "${moreDetails.holidayListId}" not found or inactive`
          );
        }
        result.holidayListAssignment = {
          id: savedProfile.id,
          holidayListId: holidayList.id,
          name: holidayList.name,
        };
      }

      // Step 3: Assign Shift
      if (moreDetails?.shiftId) {
        const shift = await queryRunner.manager.findOne(Shift, {
          where: { id: moreDetails.shiftId, isActive: true },
        });
        if (!shift) {
          throw new BadRequestException(
            `Shift with ID "${moreDetails.shiftId}" not found or inactive`
          );
        }

        const shiftAssignment = queryRunner.manager.create(ShiftAssignment, {
          userId: savedUser.id,
          shiftId: moreDetails.shiftId,
          effectiveFrom:
            jobDetails?.joiningDate ?? new Date().toISOString().split('T')[0],
          assignedBy: currentUser.id,
        });
        const savedShift = await queryRunner.manager.save(
          ShiftAssignment,
          shiftAssignment
        );
        result.shiftAssignment = {
          id: savedShift.id,
          shiftId: savedShift.shiftId,
        };
      }

      // Step 4: Assign Leave Plan + Initialize Balances
      if (moreDetails?.leavePlanId) {
        const plan = await queryRunner.manager.findOne(LeavePlan, {
          where: { id: moreDetails.leavePlanId, isActive: true },
          relations: ['leaveTypeConfigs'],
        });
        if (!plan) {
          throw new BadRequestException(
            `Leave plan with ID "${moreDetails.leavePlanId}" not found or inactive`
          );
        }

        const leavePlanAssignment = queryRunner.manager.create(
          LeavePlanAssignment,
          {
            userId: savedUser.id,
            leavePlanId: moreDetails.leavePlanId,
            effectiveFrom:
              jobDetails?.joiningDate ?? new Date().toISOString().split('T')[0],
            assignedBy: currentUser.id,
          }
        );
        const savedLpa = await queryRunner.manager.save(
          LeavePlanAssignment,
          leavePlanAssignment
        );
        result.leavePlanAssignment = {
          id: savedLpa.id,
          leavePlanId: savedLpa.leavePlanId,
        };

        // Initialize leave balances for active configs
        const activeConfigs = (plan.leaveTypeConfigs ?? []).filter(
          c => c.isActive
        );
        for (const config of activeConfigs) {
          const allocated = config.isUnlimited ? 0 : Number(config.quota);
          const balance = queryRunner.manager.create(LeaveBalance, {
            userId: savedUser.id,
            leaveTypeConfigId: config.id,
            year: plan.year,
            allocated,
            used: 0,
            carriedForward: 0,
            adjusted: 0,
            balance: allocated,
          });
          const savedBalance = await queryRunner.manager.save(
            LeaveBalance,
            balance
          );

          const transaction = queryRunner.manager.create(LeaveTransaction, {
            userId: savedUser.id,
            leaveBalanceId: savedBalance.id,
            transactionType: LeaveTransactionType.ALLOCATION,
            days: allocated,
            previousBalance: 0,
            newBalance: allocated,
            remarks: `Initial allocation for ${config.name} (${plan.name}) - onboarding`,
            performedBy: currentUser.id,
          });
          await queryRunner.manager.save(LeaveTransaction, transaction);
        }
      }

      // Step 5: Create Compensation + Salary Breakup
      if (compensation) {
        const comp = queryRunner.manager.create(Compensation, {
          userId: savedUser.id,
          annualSalary: compensation.annualSalary,
          currency: compensation.currency ?? 'INR',
          salaryEffectiveFrom:
            compensation.salaryEffectiveFrom ??
            jobDetails?.joiningDate ??
            new Date().toISOString().split('T')[0],
          regularSalary: compensation.regularSalary,
          bonus: compensation.bonus ?? 0,
          bonusIncludedInCtc: compensation.bonusIncludedInCtc ?? false,
          isPfEligible: compensation.isPfEligible ?? false,
          isEsiEligible: compensation.isEsiEligible ?? false,
          payGroup: compensation.payGroup ?? null,
          salaryStructureType: compensation.salaryStructureType,
          taxRegime: compensation.taxRegime,
        });
        const savedComp = await queryRunner.manager.save(Compensation, comp);
        result.compensation = {
          id: savedComp.id,
          annualSalary: Number(savedComp.annualSalary),
        };

        if (compensation.breakup?.length) {
          const breakups = compensation.breakup.map(item =>
            queryRunner.manager.create(SalaryBreakup, {
              compensationId: savedComp.id,
              salaryComponentId: item.salaryComponentId,
              annualAmount: item.annualAmount,
              monthlyAmount: Math.round((item.annualAmount / 12) * 100) / 100,
            })
          );
          await queryRunner.manager.save(SalaryBreakup, breakups);
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Employee onboarded successfully',
        data: result,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async resolveEmployeeNumber(
    providedNumber?: string,
    series?: string
  ): Promise<string> {
    if (providedNumber) {
      const existing = await this.profileRepo.findOne({
        where: { employeeNumber: providedNumber },
      });
      if (existing) {
        throw new BadRequestException(
          `Employee number "${providedNumber}" is already in use`
        );
      }
      return providedNumber;
    }

    const prefix = series ?? 'EMP';
    const profiles = await this.profileRepo
      .createQueryBuilder('p')
      .where('p.employeeNumber LIKE :prefix', { prefix: `${prefix}-%` })
      .orderBy('p.employeeNumber', 'DESC')
      .limit(1)
      .getMany();

    let nextSeq = 1;
    if (profiles.length > 0) {
      const lastNumber = profiles[0].employeeNumber;
      const parts = lastNumber.split('-');
      const numPart = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(numPart)) {
        nextSeq = numPart + 1;
      }
    }

    return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
  }
}
