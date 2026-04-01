import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { UserRole } from '../users/entities/user.entity.js';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { CreateLeavePlanDto } from './dto/create-leave-plan.dto.js';
import { CreateLeaveTypeConfigDto } from './dto/create-leave-type-config.dto.js';
import { UpdateLeavePlanDto } from './dto/update-leave-plan.dto.js';
import { UpdateLeaveTypeConfigDto } from './dto/update-leave-type-config.dto.js';
import { YearEndProcessingDto } from './dto/year-end-processing.dto.js';
import { LeaveBalancesService } from './leave-balances.service.js';
import { LeavePlansService } from './leave-plans.service.js';
import { LeaveTypeConfigsService } from './leave-type-configs.service.js';

@ApiTags('leave-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/leave-plans')
export class LeavePlansController {
  constructor(
    private readonly plansService: LeavePlansService,
    private readonly typeConfigsService: LeaveTypeConfigsService,
    private readonly balancesService: LeaveBalancesService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a leave plan (HR only)' })
  @ApiResponse({ status: 201, description: 'Leave plan created' })
  create(@Body() dto: CreateLeavePlanDto) {
    return this.plansService.create(dto);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get leave plan options for dropdowns (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave plan options retrieved' })
  findAllOptions() {
    return this.plansService.findAllOptions();
  }

  @Get()
  @ApiOperation({ summary: 'List all leave plans (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave plans retrieved' })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.plansService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave plan details (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave plan retrieved' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a leave plan (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave plan updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeavePlanDto
  ) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a leave plan (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave plan deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.remove(id);
  }

  // --- Leave Type Configs (nested under plan) ---

  @Post(':planId/leave-types')
  @ApiOperation({ summary: 'Add a leave type to a plan (HR only)' })
  @ApiResponse({ status: 201, description: 'Leave type added' })
  addLeaveType(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateLeaveTypeConfigDto
  ) {
    return this.typeConfigsService.create(planId, dto);
  }

  @Patch(':planId/leave-types/:typeId')
  @ApiOperation({ summary: 'Update a leave type config (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave type updated' })
  updateLeaveType(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @Body() dto: UpdateLeaveTypeConfigDto
  ) {
    return this.typeConfigsService.update(planId, typeId, dto);
  }

  @Delete(':planId/leave-types/:typeId')
  @ApiOperation({ summary: 'Remove a leave type from a plan (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave type removed' })
  removeLeaveType(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('typeId', ParseUUIDPipe) typeId: string
  ) {
    return this.typeConfigsService.remove(planId, typeId);
  }

  // --- Year-End Processing ---

  @Post(':planId/year-end-processing')
  @ApiOperation({ summary: 'Run year-end processing for a plan (HR only)' })
  @ApiResponse({ status: 200, description: 'Year-end processing complete' })
  yearEndProcessing(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: YearEndProcessingDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.balancesService.yearEndProcessing(planId, dto, user);
  }
}
