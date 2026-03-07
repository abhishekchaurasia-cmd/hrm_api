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

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { UserRole } from '../users/entities/user.entity.js';

import { CreateLeaveDto } from './dto/create-leave.dto.js';
import { ReviewLeaveDto } from './dto/review-leave.dto.js';
import { LeavesService } from './leaves.service.js';

@ApiTags('leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a leave request' })
  @ApiResponse({ status: 201, description: 'Leave request created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeaveDto) {
    return this.leavesService.createLeave(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my leave requests' })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved' })
  getMyLeaves(@CurrentUser() user: AuthUser) {
    return this.leavesService.getMyLeaves(user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get all leave requests (HR only)' })
  @ApiResponse({ status: 200, description: 'All leave requests retrieved' })
  getAllLeaves(@CurrentUser() user: AuthUser) {
    return this.leavesService.getAllLeaves(user);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get pending leave requests (HR only)' })
  @ApiResponse({ status: 200, description: 'Pending leave requests retrieved' })
  getPendingLeaves(@CurrentUser() user: AuthUser) {
    return this.leavesService.getPendingLeaves(user);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Review a leave request (HR only)' })
  @ApiResponse({ status: 200, description: 'Leave request reviewed' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  reviewLeave(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewLeaveDto
  ) {
    return this.leavesService.reviewLeave(user, id, dto);
  }

  @Patch(':id/cancel')
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
