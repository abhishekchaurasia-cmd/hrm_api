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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { UserRole } from './entities/user.entity.js';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto.js';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto.js';
import { EmployeeProfilesService } from './employee-profiles.service.js';

@ApiTags('employee-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/employee-profiles')
export class EmployeeProfilesController {
  constructor(private readonly service: EmployeeProfilesService) {}

  @Post()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Create employee profile (HR only)' })
  @ApiResponse({ status: 201, description: 'Employee profile created' })
  create(@Body() dto: CreateEmployeeProfileDto) {
    return this.service.create(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved' })
  findMyProfile(@CurrentUser() currentUser: AuthUser) {
    return this.service.findOrCreateMyProfile(currentUser.id);
  }

  @Get(':userId')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get employee profile by user ID (HR only)' })
  @ApiResponse({ status: 200, description: 'Employee profile retrieved' })
  findByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.service.findByUserId(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile updated' })
  updateMyProfile(
    @CurrentUser() currentUser: AuthUser,
    @Body() dto: UpdateEmployeeProfileDto
  ) {
    return this.service.updateMyProfile(currentUser.id, dto);
  }

  @Patch(':userId')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Update employee profile (HR only)' })
  @ApiResponse({ status: 200, description: 'Employee profile updated' })
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateEmployeeProfileDto
  ) {
    return this.service.update(userId, dto);
  }
}
