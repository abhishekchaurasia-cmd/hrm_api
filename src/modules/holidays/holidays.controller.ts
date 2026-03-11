import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';

import { HolidayListsService } from './holiday-lists.service.js';

@ApiTags('holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/holidays')
export class HolidaysController {
  constructor(private readonly holidayListsService: HolidayListsService) {}

  @Get('plan')
  @ApiOperation({
    summary: 'Get assigned holiday plan for the current employee',
  })
  @ApiResponse({ status: 200, description: 'Holiday plan retrieved' })
  getMyPlan(@CurrentUser() user: AuthUser) {
    return this.holidayListsService.getEmployeeHolidayPlan(user.id);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming holidays for the current employee' })
  @ApiResponse({ status: 200, description: 'Upcoming holidays retrieved' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of upcoming holidays to return (default 5)',
  })
  getUpcomingHolidays(
    @CurrentUser() user: AuthUser,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number
  ) {
    return this.holidayListsService.getUpcomingHolidays(user.id, limit);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get holiday calendar grouped by month' })
  @ApiResponse({ status: 200, description: 'Holiday calendar retrieved' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year (defaults to current year)',
  })
  getHolidayCalendar(
    @CurrentUser() user: AuthUser,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number
  ) {
    return this.holidayListsService.getEmployeeHolidayCalendar(user.id, year);
  }

  @Get()
  @ApiOperation({ summary: 'Get holidays for the current employee' })
  @ApiResponse({ status: 200, description: 'Holidays retrieved' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year (defaults to current year)',
  })
  getMyHolidays(
    @CurrentUser() user: AuthUser,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number
  ) {
    return this.holidayListsService.getEmployeeHolidays(user.id, year);
  }
}
