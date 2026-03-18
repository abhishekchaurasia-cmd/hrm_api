import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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

import { AssignPenalizationPolicyDto } from './dto/assign-penalization-policy.dto.js';
import { PenalizationAssignmentsService } from './penalization-assignments.service.js';

@ApiTags('penalization-policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/penalization-policies')
export class PenalizationAssignmentsController {
  constructor(
    private readonly assignmentsService: PenalizationAssignmentsService
  ) {}

  @Post(':id/assignments')
  @ApiOperation({ summary: 'Assign employees to a policy (HR only)' })
  @ApiResponse({ status: 201, description: 'Employees assigned' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPenalizationPolicyDto
  ) {
    return this.assignmentsService.assign(id, dto.userIds);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Get policy assignments (HR only)' })
  @ApiResponse({ status: 200, description: 'Assignments retrieved' })
  findByPolicy(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentsService.findByPolicy(id);
  }

  @Delete(':id/assignments/:assignmentId')
  @ApiOperation({ summary: 'Unassign employee from policy (HR only)' })
  @ApiResponse({ status: 200, description: 'Employee unassigned' })
  unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string
  ) {
    return this.assignmentsService.unassign(id, assignmentId);
  }
}
