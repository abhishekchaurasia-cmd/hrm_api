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
