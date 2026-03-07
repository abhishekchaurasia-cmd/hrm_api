import { Controller, Get, Post, UseGuards } from '@nestjs/common';
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

import { AttendanceService } from './attendance.service.js';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('api/v1/attendance/punch-in')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Punch in for current user' })
  @ApiResponse({ status: 201, description: 'Punch in recorded' })
  punchIn(@CurrentUser() user: AuthUser) {
    return this.attendanceService.punchIn(user);
  }

  @Post('api/v1/attendance/punch-out')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Punch out for current user' })
  @ApiResponse({ status: 201, description: 'Punch out recorded' })
  punchOut(@CurrentUser() user: AuthUser) {
    return this.attendanceService.punchOut(user);
  }

  @Get('api/v1/attendance/me/today')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user attendance for today' })
  @ApiResponse({ status: 200, description: 'Today attendance retrieved' })
  getMyToday(@CurrentUser() user: AuthUser) {
    return this.attendanceService.getMyTodayAttendance(user);
  }

  @Get('api/v1/hr/attendance/today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get all employees attendance for today (HR only)' })
  @ApiResponse({ status: 200, description: 'HR attendance list retrieved' })
  getHrToday(@CurrentUser() user: AuthUser) {
    return this.attendanceService.getHrTodayAttendance(user);
  }
}
