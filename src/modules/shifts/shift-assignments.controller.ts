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
  ApiQuery,
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
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto.js';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto.js';
import { ShiftAssignmentsService } from './shift-assignments.service.js';

@ApiTags('shift-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/shift-assignments')
export class ShiftAssignmentsController {
  constructor(private readonly assignmentsService: ShiftAssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a shift to an employee (HR only)' })
  @ApiResponse({ status: 201, description: 'Shift assigned' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShiftAssignmentDto) {
    return this.assignmentsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List shift assignments (HR only)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'shiftId', required: false })
  @ApiResponse({ status: 200, description: 'Assignments retrieved' })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('userId') userId?: string,
    @Query('shiftId') shiftId?: string
  ) {
    return this.assignmentsService.findAll(pagination, userId, shiftId);
  }

  @Get('employee/:userId')
  @ApiOperation({
    summary: "Get an employee's current shift assignment (HR only)",
  })
  @ApiResponse({ status: 200, description: 'Assignment retrieved' })
  findByEmployee(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.assignmentsService.findByEmployee(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift assignment (HR only)' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftAssignmentDto
  ) {
    return this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a shift assignment (HR only)' })
  @ApiResponse({ status: 200, description: 'Assignment removed' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentsService.remove(id);
  }
}
