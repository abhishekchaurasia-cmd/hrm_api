import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-response.interface.js';
import { paginate } from '../../common/utils/paginate.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { EmployeeProfile } from './entities/employee-profile.entity.js';
import { User, UserRole } from './entities/user.entity.js';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  departmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmployeeProfile)
    private readonly profileRepository: Repository<EmployeeProfile>,
    private readonly configService: ConfigService
  ) {}

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      departmentId: user.departmentId ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findAll(
    pagination: PaginationQueryDto
  ): Promise<ApiResponse<PaginatedResult<UserResponse>>> {
    const { page, limit } = pagination;
    const [users, total] = await this.userRepository.findAndCount({
      order: { firstName: 'ASC', lastName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Users retrieved',
      data: paginate(
        users.map(u => this.toUserResponse(u)),
        total,
        page,
        limit
      ),
    };
  }

  async findOptions(): Promise<
    ApiResponse<
      Array<{
        id: string;
        userId: string;
        firstName: string;
        lastName: string;
        email: string;
        role: UserRole;
      }>
    >
  > {
    const users = await this.userRepository.find({
      where: { isActive: true },
      select: ['id', 'firstName', 'lastName', 'email', 'role'],
      order: { firstName: 'ASC', lastName: 'ASC' },
    });

    return {
      success: true,
      message: 'User options retrieved',
      data: users.map(u => ({
        id: u.id,
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
      })),
    };
  }

  async findOne(id: string): Promise<ApiResponse<UserResponse>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return {
      success: true,
      message: 'User retrieved',
      data: this.toUserResponse(user),
    };
  }

  async create(dto: CreateUserDto): Promise<ApiResponse<UserResponse>> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists'
      );
    }

    const rounds = this.configService.get<number>('security.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      role: dto.role ?? UserRole.EMPLOYEE,
      departmentId: dto.departmentId ?? null,
    });

    const saved = await this.userRepository.save(user);

    return {
      success: true,
      message: 'User created',
      data: this.toUserResponse(saved),
    };
  }

  async update(
    id: string,
    dto: UpdateUserDto
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    Object.assign(user, dto);
    const saved = await this.userRepository.save(user);

    return {
      success: true,
      message: 'User updated',
      data: this.toUserResponse(saved),
    };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    await this.userRepository.remove(user);

    return {
      success: true,
      message: 'User permanently deleted',
      data: null,
    };
  }

  async getUpcomingAnniversaries(days = 30): Promise<
    ApiResponse<
      Array<{
        userId: string;
        firstName: string;
        lastName: string;
        joiningDate: string;
        yearsOfService: number;
        department: string | null;
      }>
    >
  > {
    const today = new Date();
    const pairs: Array<{ month: number; day: number }> = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      pairs.push({ month: d.getMonth() + 1, day: d.getDate() });
    }

    const conditions = pairs
      .map(
        (_, i) =>
          `(EXTRACT(MONTH FROM ep."joiningDate") = :am${i} AND EXTRACT(DAY FROM ep."joiningDate") = :ad${i})`
      )
      .join(' OR ');

    const params: Record<string, number> = {};
    pairs.forEach((p, i) => {
      params[`am${i}`] = p.month;
      params[`ad${i}`] = p.day;
    });

    const raw: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      joiningDate: string;
      department: string | null;
    }> = await this.profileRepository
      .createQueryBuilder('ep')
      .innerJoin('ep.user', 'u')
      .leftJoin('u.department', 'dept')
      .select([
        'u.id AS "userId"',
        'u."firstName" AS "firstName"',
        'u."lastName" AS "lastName"',
        'ep."joiningDate" AS "joiningDate"',
        'dept.name AS "department"',
      ])
      .where('ep."joiningDate" IS NOT NULL')
      .andWhere('u."isActive" = true')
      .andWhere(`(${conditions})`)
      .setParameters(params)
      .getRawMany();

    const currentYear = today.getFullYear();
    const results = raw
      .map(r => ({
        ...r,
        yearsOfService:
          currentYear - new Date(r.joiningDate + 'T00:00:00').getFullYear(),
      }))
      .filter(r => r.yearsOfService > 0);

    return {
      success: true,
      message: 'Upcoming work anniversaries retrieved',
      data: results,
    };
  }

  async getUpcomingBirthdays(days = 7): Promise<
    ApiResponse<
      Array<{
        userId: string;
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        department: string | null;
      }>
    >
  > {
    const today = new Date();
    const pairs: Array<{ month: number; day: number }> = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      pairs.push({ month: d.getMonth() + 1, day: d.getDate() });
    }

    const conditions = pairs
      .map(
        (_, i) =>
          `(EXTRACT(MONTH FROM ep."dateOfBirth") = :m${i} AND EXTRACT(DAY FROM ep."dateOfBirth") = :d${i})`
      )
      .join(' OR ');

    const params: Record<string, number> = {};
    pairs.forEach((p, i) => {
      params[`m${i}`] = p.month;
      params[`d${i}`] = p.day;
    });

    const results: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      department: string | null;
    }> = await this.profileRepository
      .createQueryBuilder('ep')
      .innerJoin('ep.user', 'u')
      .leftJoin('u.department', 'dept')
      .select([
        'u.id AS "userId"',
        'u."firstName" AS "firstName"',
        'u."lastName" AS "lastName"',
        'ep."dateOfBirth" AS "dateOfBirth"',
        'dept.name AS "department"',
      ])
      .where('ep."dateOfBirth" IS NOT NULL')
      .andWhere('u."isActive" = true')
      .andWhere(`(${conditions})`)
      .setParameters(params)
      .getRawMany();

    return {
      success: true,
      message: 'Upcoming birthdays retrieved',
      data: results,
    };
  }
}
