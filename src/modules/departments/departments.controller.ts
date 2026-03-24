import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../users/entities/user.entity.js';

import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { DepartmentsService } from './departments.service.js';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get('options')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get department options for dropdowns (HR only)' })
  @ApiResponse({ status: 200, description: 'Department options retrieved' })
  findAllOptions() {
    return this.departmentsService.findAllOptions();
  }

  @Get()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get all departments (HR only)' })
  @ApiResponse({ status: 200, description: 'Departments retrieved' })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get department by ID (HR only)' })
  @ApiResponse({ status: 200, description: 'Department retrieved' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Create a department (HR only)' })
  @ApiResponse({ status: 201, description: 'Department created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Update a department (HR only)' })
  @ApiResponse({ status: 200, description: 'Department updated' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Deactivate a department (HR only)' })
  @ApiResponse({ status: 200, description: 'Department deactivated' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.remove(id);
  }
}
