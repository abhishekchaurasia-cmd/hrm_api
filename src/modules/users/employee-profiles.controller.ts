import {
  Body,
  Controller,
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
import { UserRole } from './entities/user.entity.js';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto.js';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto.js';
import { EmployeeProfilesService } from './employee-profiles.service.js';

@ApiTags('employee-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/employee-profiles')
export class EmployeeProfilesController {
  constructor(private readonly service: EmployeeProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create employee profile (HR only)' })
  @ApiResponse({ status: 201, description: 'Employee profile created' })
  create(@Body() dto: CreateEmployeeProfileDto) {
    return this.service.create(dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get employee profile by user ID (HR only)' })
  @ApiResponse({ status: 200, description: 'Employee profile retrieved' })
  findByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.service.findByUserId(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update employee profile (HR only)' })
  @ApiResponse({ status: 200, description: 'Employee profile updated' })
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateEmployeeProfileDto
  ) {
    return this.service.update(userId, dto);
  }
}
