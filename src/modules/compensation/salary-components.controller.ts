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
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto.js';
import { SalaryComponentsService } from './salary-components.service.js';

@ApiTags('salary-components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/salary-components')
export class SalaryComponentsController {
  constructor(private readonly service: SalaryComponentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create salary component (HR only)' })
  @ApiResponse({ status: 201, description: 'Salary component created' })
  create(@Body() dto: CreateSalaryComponentDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all salary components (HR only)' })
  @ApiResponse({ status: 200, description: 'Salary components retrieved' })
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update salary component (HR only)' })
  @ApiResponse({ status: 200, description: 'Salary component updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSalaryComponentDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate salary component (HR only)' })
  @ApiResponse({ status: 200, description: 'Salary component deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
