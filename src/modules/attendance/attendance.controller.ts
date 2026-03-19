import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
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

  @Get('api/v1/attendance/me/history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get attendance history for current user' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month (1-12), defaults to current month',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Year, defaults to current year',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number, defaults to 1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page, defaults to 31',
  })
  @ApiResponse({ status: 200, description: 'Attendance history retrieved' })
  getMyHistory(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 31;
    return this.attendanceService.getMyAttendanceHistory(user, m, y, p, l);
  }

  @Get('api/v1/attendance/me/summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get monthly attendance summary for current user' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month (1-12), defaults to current month',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Year, defaults to current year',
  })
  @ApiResponse({ status: 200, description: 'Attendance summary retrieved' })
  getMySummary(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
    @Query('year') year?: string
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.attendanceService.getMyAttendanceSummary(user, m, y);
  }

  @Get('api/v1/hr/attendance/today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get all employees attendance for today (HR only)' })
  @ApiResponse({ status: 200, description: 'HR attendance list retrieved' })
  getHrToday(@CurrentUser() user: AuthUser) {
    return this.attendanceService.getHrTodayAttendance(user);
  }

  @Get('api/v1/attendance/me/detailed-report')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get detailed attendance report for current user' })
  @ApiQuery({ name: 'month', required: false, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: false, description: 'Year' })
  @ApiResponse({ status: 200, description: 'Detailed report retrieved' })
  getMyDetailedReport(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
    @Query('year') year?: string
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.attendanceService.getDetailedReport(user.id, m, y);
  }

  @Get('api/v1/hr/attendance/employee/:userId/detailed-report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({
    summary: 'Get detailed attendance report for an employee (HR only)',
  })
  @ApiParam({ name: 'userId', description: 'Employee user ID' })
  @ApiQuery({ name: 'month', required: false, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: false, description: 'Year' })
  @ApiResponse({
    status: 200,
    description: 'Employee detailed report retrieved',
  })
  getEmployeeDetailedReport(
    @Param('userId') userId: string,
    @Query('month') month?: string,
    @Query('year') year?: string
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.attendanceService.getDetailedReport(userId, m, y);
  }

  @Get('api/v1/hr/attendance/monthly-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({
    summary: 'Get monthly attendance summary for all employees (HR only)',
  })
  @ApiQuery({ name: 'month', required: false, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: false, description: 'Year' })
  @ApiResponse({ status: 200, description: 'Monthly summary retrieved' })
  getHrMonthlySummary(
    @Query('month') month?: string,
    @Query('year') year?: string
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.attendanceService.getHrMonthlySummary(m, y);
  }
}
