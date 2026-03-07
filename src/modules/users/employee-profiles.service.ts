import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto.js';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto.js';
import { EmployeeProfile } from './entities/employee-profile.entity.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class EmployeeProfilesService {
  constructor(
    @InjectRepository(EmployeeProfile)
    private readonly profileRepo: Repository<EmployeeProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>
  ) {}

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

  async findByUserId(userId: string): Promise<ApiResponse<EmployeeProfile>> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: [
        'reportingManager',
        'dottedLineManager',
        'legalEntity',
        'businessUnit',
        'location',
        'holidayList',
      ],
    });
    if (!profile) {
      throw new NotFoundException(
        `Employee profile not found for user "${userId}"`
      );
    }
    return {
      success: true,
      message: 'Employee profile retrieved',
      data: profile,
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
    const saved = await this.profileRepo.save(profile);
    return { success: true, message: 'Employee profile updated', data: saved };
  }
}
