import {
  Body,
  Controller,
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

import { AdjustLeaveBalanceDto } from './dto/adjust-leave-balance.dto.js';
import { LeaveBalanceOverviewQueryDto } from './dto/leave-balance-overview-query.dto.js';
import {
  LeaveBalanceQueryDto,
  LeaveTransactionQueryDto,
} from './dto/leave-balance-query.dto.js';
import { LeaveBalancesService } from './leave-balances.service.js';

@ApiTags('leave-balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/leave-balances')
export class LeaveBalancesController {
  constructor(private readonly balancesService: LeaveBalancesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user leave balances' })
  @ApiQuery({ name: 'year', required: false })
  @ApiResponse({ status: 200, description: 'Leave balances retrieved' })
  findMyBalances(@CurrentUser() user: AuthUser, @Query('year') year?: string) {
    const balanceYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.balancesService.findByEmployee(user.id, balanceYear);
  }

  @Post('initialize')
  @Roles(UserRole.HR)
  @ApiOperation({
    summary:
      'Initialize leave balances for all employees assigned to a plan (HR only)',
  })
  @ApiQuery({ name: 'planId', required: true })
  @ApiResponse({ status: 201, description: 'Balances initialized' })
  initialize(
    @Query('planId', ParseUUIDPipe) planId: string,
    @CurrentUser() user: AuthUser
  ) {
    return this.balancesService.initializeBalances(planId, user);
  }

  @Get()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get all leave balances (HR only)' })
  @ApiResponse({ status: 200, description: 'Balances retrieved' })
  findAll(@Query() query: LeaveBalanceQueryDto) {
    const { page, limit, userId, planId, year } = query;
    return this.balancesService.findAll({ page, limit }, userId, planId, year);
  }

  @Get('overview')
  @Roles(UserRole.HR)
  @ApiOperation({
    summary: 'Get leave balances grouped by employee (HR only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Leave balance overview retrieved',
  })
  findOverview(@Query() query: LeaveBalanceOverviewQueryDto) {
    const { page, limit, year, search } = query;
    return this.balancesService.findOverview({ page, limit }, year, search);
  }

  @Get('employee/:userId')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: "Get an employee's leave balances (HR only)" })
  @ApiQuery({ name: 'year', required: false })
  @ApiResponse({ status: 200, description: 'Employee balances retrieved' })
  findByEmployee(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('year') year?: string
  ) {
    return this.balancesService.findByEmployee(
      userId,
      year ? parseInt(year, 10) : undefined
    );
  }

  @Post('adjust')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Manually adjust a leave balance (HR only)' })
  @ApiResponse({ status: 200, description: 'Balance adjusted' })
  adjust(@Body() dto: AdjustLeaveBalanceDto, @CurrentUser() user: AuthUser) {
    return this.balancesService.adjust(dto, user);
  }

  @Get('transactions')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get leave transaction audit log (HR only)' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  getTransactions(@Query() query: LeaveTransactionQueryDto) {
    const { page, limit, userId, year } = query;
    return this.balancesService.getTransactions({ page, limit }, userId, year);
  }
}
