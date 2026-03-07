import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
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

  async findAll(): Promise<ApiResponse<UserResponse[]>> {
    const users = await this.userRepository.find({
      order: { firstName: 'ASC', lastName: 'ASC' },
    });

    return {
      success: true,
      message: 'Users retrieved',
      data: users.map(u => this.toUserResponse(u)),
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

    user.isActive = false;
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'User deactivated',
      data: null,
    };
  }
}
