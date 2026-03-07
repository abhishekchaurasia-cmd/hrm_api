import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';

import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { Department } from './entities/department.entity.js';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>
  ) {}

  async findAll(): Promise<ApiResponse<Department[]>> {
    const departments = await this.departmentRepository.find({
      order: { name: 'ASC' },
    });

    return {
      success: true,
      message: 'Departments retrieved',
      data: departments,
    };
  }

  async findOne(id: string): Promise<ApiResponse<Department>> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    return {
      success: true,
      message: 'Department retrieved',
      data: department,
    };
  }

  async create(dto: CreateDepartmentDto): Promise<ApiResponse<Department>> {
    const existing = await this.departmentRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Department "${dto.name}" already exists`);
    }

    const department = this.departmentRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });
    const saved = await this.departmentRepository.save(department);

    return {
      success: true,
      message: 'Department created',
      data: saved,
    };
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto
  ): Promise<ApiResponse<Department>> {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    if (dto.name && dto.name !== department.name) {
      const existing = await this.departmentRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(
          `Department "${dto.name}" already exists`
        );
      }
    }

    Object.assign(department, dto);
    const saved = await this.departmentRepository.save(department);

    return {
      success: true,
      message: 'Department updated',
      data: saved,
    };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    department.isActive = false;
    await this.departmentRepository.save(department);

    return {
      success: true,
      message: 'Department deactivated',
      data: null,
    };
  }
}
