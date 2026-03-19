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

import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../users/entities/user.entity.js';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { AssignTimeTrackingPolicyDto } from './dto/assign-time-tracking-policy.dto.js';
import { CreateTimeTrackingPolicyDto } from './dto/create-time-tracking-policy.dto.js';
import { UpdateTimeTrackingPolicyDto } from './dto/update-time-tracking-policy.dto.js';
import { TimeTrackingPoliciesService } from './time-tracking-policies.service.js';

@ApiTags('time-tracking-policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/time-tracking-policies')
export class TimeTrackingPoliciesController {
  constructor(private readonly policiesService: TimeTrackingPoliciesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a time tracking policy (HR only)' })
  @ApiResponse({ status: 201, description: 'Policy created' })
  create(@Body() dto: CreateTimeTrackingPolicyDto) {
    return this.policiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all time tracking policies (HR only)' })
  @ApiResponse({ status: 200, description: 'Policies retrieved' })
  findAll() {
    return this.policiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get time tracking policy details (HR only)' })
  @ApiResponse({ status: 200, description: 'Policy retrieved' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.policiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a time tracking policy (HR only)' })
  @ApiResponse({ status: 200, description: 'Policy updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeTrackingPolicyDto
  ) {
    return this.policiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a time tracking policy (HR only)' })
  @ApiResponse({ status: 200, description: 'Policy deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.policiesService.remove(id);
  }

  @Post(':id/assignments')
  @ApiOperation({
    summary: 'Assign employees to a time tracking policy (HR only)',
  })
  @ApiResponse({ status: 201, description: 'Employees assigned' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTimeTrackingPolicyDto
  ) {
    return this.policiesService.assign(id, dto.userIds);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Get policy assignments (HR only)' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved' })
  findAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationQueryDto
  ) {
    return this.policiesService.findAssignments(id, pagination);
  }

  @Delete(':id/assignments/:assignmentId')
  @ApiOperation({ summary: 'Unassign employee from policy (HR only)' })
  @ApiResponse({ status: 200, description: 'Employee unassigned' })
  unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string
  ) {
    return this.policiesService.unassign(id, assignmentId);
  }
}
