import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
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

import { ApproveRejectLeaveDto } from './dto/approve-reject-leave.dto.js';
import { CreateLeaveDto } from './dto/create-leave.dto.js';
import { HrLeavesQueryDto } from './dto/hr-leaves-query.dto.js';
import { ReviewLeaveDto } from './dto/review-leave.dto.js';
import { LeaveStatus } from './entities/leave.entity.js';
import { LeavesService } from './leaves.service.js';

@ApiTags('leaves')
@ApiBearerAuth()
@Controller()
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post('api/v1/leaves')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a leave request' })
  @ApiResponse({ status: 201, description: 'Leave request created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeaveDto) {
    return this.leavesService.createLeave(user, dto);
  }

  @Get('api/v1/leaves/me/available-types')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get available leave types with balances for current user',
  })
  @ApiResponse({ status: 200, description: 'Available leave types retrieved' })
  getAvailableLeaveTypes(@CurrentUser() user: AuthUser) {
    return this.leavesService.getAvailableLeaveTypes(user);
  }

  @Get('api/v1/leaves/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my leave requests with optional filtering' })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter to date (YYYY-MM-DD)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyLeaves(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: LeaveStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
  ) {
    return this.leavesService.getMyLeavesFiltered(user, {
      status,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('api/v1/hr/leaves')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get all leave requests with filtering (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved' })
  getHrLeaves(@Query() query: HrLeavesQueryDto) {
    return this.leavesService.getHrLeaves(query);
  }

  @Get('api/v1/leaves')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get all leave requests (HR only) - legacy' })
  @ApiResponse({ status: 200, description: 'All leave requests retrieved' })
  getAllLeaves(@CurrentUser() user: AuthUser) {
    return this.leavesService.getAllLeaves(user);
  }

  @Get('api/v1/leaves/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get pending leave requests (HR only)' })
  @ApiResponse({ status: 200, description: 'Pending leave requests retrieved' })
  getPendingLeaves(@CurrentUser() user: AuthUser) {
    return this.leavesService.getPendingLeaves(user);
  }

  @Patch('api/v1/leaves/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Approve a leave request (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave request approved' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  approveLeave(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRejectLeaveDto
  ) {
    return this.leavesService.approveLeave(user, id, dto);
  }

  @Patch('api/v1/leaves/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Reject a leave request (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave request rejected' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  rejectLeave(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRejectLeaveDto
  ) {
    return this.leavesService.rejectLeave(user, id, dto);
  }

  @Patch('api/v1/leaves/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Review a leave request (HR only) - legacy' })
  @ApiResponse({ status: 200, description: 'Leave request reviewed' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  reviewLeave(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewLeaveDto
  ) {
    return this.leavesService.reviewLeave(user, id, dto);
  }

  @Patch('api/v1/leaves/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel own leave request' })
  @ApiResponse({ status: 200, description: 'Leave request cancelled' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  cancelLeave(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.leavesService.cancelLeave(user, id);
  }
}
