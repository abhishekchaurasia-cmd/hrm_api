import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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

import { CreateLeavePlanAssignmentDto } from './dto/create-leave-plan-assignment.dto.js';
import { FindLeavePlanAssignmentsQueryDto } from './dto/find-leave-plan-assignments-query.dto.js';
import { LeavePlanAssignmentsService } from './leave-plan-assignments.service.js';

@ApiTags('leave-plan-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/leave-plan-assignments')
export class LeavePlanAssignmentsController {
  constructor(
    private readonly assignmentsService: LeavePlanAssignmentsService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Assign a leave plan to an employee (HR only)' })
  @ApiResponse({ status: 201, description: 'Leave plan assigned' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLeavePlanAssignmentDto
  ) {
    return this.assignmentsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List leave plan assignments (HR only)' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved' })
  findAll(@Query() query: FindLeavePlanAssignmentsQueryDto) {
    return this.assignmentsService.findAll(query, query.userId, query.planId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a leave plan assignment (HR only)' })
  @ApiResponse({ status: 200, description: 'Assignment removed' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentsService.remove(id);
  }
}
