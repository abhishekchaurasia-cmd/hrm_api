import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { Compensation } from '../compensation/entities/compensation.entity.js';
import { LeavePlanAssignment } from '../leave-policies/entities/leave-plan-assignment.entity.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto.js';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto.js';
import { EmployeeProfile } from './entities/employee-profile.entity.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class EmployeeProfilesService {
  private readonly profileRelations = [
    'user',
    'user.department',
    'reportingManager',
    'dottedLineManager',
    'legalEntity',
    'businessUnit',
    'location',
    'holidayList',
  ] as const;

  constructor(
    @InjectRepository(EmployeeProfile)
    private readonly profileRepo: Repository<EmployeeProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Compensation)
    private readonly compensationRepo: Repository<Compensation>,
    @InjectRepository(ShiftAssignment)
    private readonly shiftAssignmentRepo: Repository<ShiftAssignment>,
    @InjectRepository(LeavePlanAssignment)
    private readonly leavePlanAssignmentRepo: Repository<LeavePlanAssignment>
  ) {}

  private async generateEmployeeNumber(prefix = 'EMP'): Promise<string> {
    const profiles = await this.profileRepo
      .createQueryBuilder('p')
      .where('p.employeeNumber LIKE :prefix', { prefix: `${prefix}-%` })
      .orderBy('p.employeeNumber', 'DESC')
      .limit(1)
      .getMany();

    let nextSeq = 1;
    if (profiles.length > 0) {
      const parts = profiles[0].employeeNumber.split('-');
      const numPart = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(numPart)) {
        nextSeq = numPart + 1;
      }
    }

    return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
  }

  private async getProfileWithRelated(
    userId: string
  ): Promise<Record<string, unknown>> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: [...this.profileRelations],
    });

    if (!profile) {
      throw new NotFoundException(
        `Employee profile not found for user "${userId}"`
      );
    }

    const [compensation, shiftAssignment, leavePlanAssignment] =
      await Promise.all([
        this.compensationRepo.findOne({
          where: { userId, isActive: true },
          relations: ['breakups', 'breakups.salaryComponent'],
          order: { salaryEffectiveFrom: 'DESC' },
        }),
        this.shiftAssignmentRepo.findOne({
          where: { userId, isActive: true },
          relations: ['shift', 'shift.weeklyOffs'],
          order: { effectiveFrom: 'DESC' },
        }),
        this.leavePlanAssignmentRepo.findOne({
          where: { userId, isActive: true },
          relations: ['leavePlan'],
          order: { effectiveFrom: 'DESC' },
        }),
      ]);

    return {
      ...profile,
      compensation: compensation ?? null,
      shiftAssignment: shiftAssignment ?? null,
      leavePlanAssignment: leavePlanAssignment ?? null,
    };
  }

  async findOrCreateMyProfile(
    userId: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    let profile = await this.profileRepo.findOne({ where: { userId } });

    if (!profile) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID "${userId}" not found`);
      }

      const employeeNumber = await this.generateEmployeeNumber('EMP');

      profile = this.profileRepo.create({
        userId,
        employeeNumber,
        displayName: `${user.firstName} ${user.lastName}`.trim() || null,
      });
      await this.profileRepo.save(profile);
    }

    const data = await this.getProfileWithRelated(userId);

    return {
      success: true,
      message: 'Employee profile retrieved',
      data,
    };
  }

  async updateMyProfile(
    userId: string,
    dto: UpdateEmployeeProfileDto
  ): Promise<ApiResponse<Record<string, unknown>>> {
    let profile = await this.profileRepo.findOne({ where: { userId } });

    if (!profile) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID "${userId}" not found`);
      }

      const employeeNumber = await this.generateEmployeeNumber('EMP');
      profile = this.profileRepo.create({
        userId,
        employeeNumber,
        displayName: `${user.firstName} ${user.lastName}`.trim() || null,
      });
    }

    Object.assign(profile, dto);
    await this.profileRepo.save(profile);

    const data = await this.getProfileWithRelated(userId);

    return {
      success: true,
      message: 'Employee profile updated',
      data,
    };
  }

  async create(
    dto: CreateEmployeeProfileDto
  ): Promise<ApiResponse<EmployeeProfile>> {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }

    const existing = await this.profileRepo.findOne({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new BadRequestException(
        `Employee profile already exists for user "${dto.userId}"`
      );
    }

    const dupNumber = await this.profileRepo.findOne({
      where: { employeeNumber: dto.employeeNumber },
    });
    if (dupNumber) {
      throw new BadRequestException(
        `Employee number "${dto.employeeNumber}" is already in use`
      );
    }

    const profile = this.profileRepo.create(dto);
    const saved = await this.profileRepo.save(profile);
    return { success: true, message: 'Employee profile created', data: saved };
  }

  async findByUserId(
    userId: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const data = await this.getProfileWithRelated(userId);

    return {
      success: true,
      message: 'Employee profile retrieved',
      data,
    };
  }

  async update(
    userId: string,
    dto: UpdateEmployeeProfileDto
  ): Promise<ApiResponse<EmployeeProfile>> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        `Employee profile not found for user "${userId}"`
      );
    }

    Object.assign(profile, dto);
    await this.profileRepo.save(profile);

    const updated = await this.profileRepo.findOne({
      where: { userId },
      relations: [...this.profileRelations],
    });

    if (!updated) {
      throw new NotFoundException(
        `Employee profile not found for user "${userId}"`
      );
    }

    return {
      success: true,
      message: 'Employee profile updated',
      data: updated,
    };
  }
}
