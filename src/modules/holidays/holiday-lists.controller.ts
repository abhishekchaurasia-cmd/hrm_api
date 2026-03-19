import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
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

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { AssignEmployeesDto } from './dto/assign-employees.dto.js';
import { BulkCreateHolidaysDto } from './dto/bulk-create-holidays.dto.js';
import { CreateHolidayDto } from './dto/create-holiday.dto.js';
import { CreateHolidayListDto } from './dto/create-holiday-list.dto.js';
import { ImportHolidaysDto } from './dto/import-holidays.dto.js';
import { UpdateHolidayDto } from './dto/update-holiday.dto.js';
import { UpdateHolidayListDto } from './dto/update-holiday-list.dto.js';
import { HolidayListsService } from './holiday-lists.service.js';
import { PublicHolidaysService } from './public-holidays.service.js';

@ApiTags('holiday-lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/holiday-lists')
export class HolidayListsController {
  constructor(
    private readonly service: HolidayListsService,
    private readonly publicHolidaysService: PublicHolidaysService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create holiday list (HR only)' })
  @ApiResponse({ status: 201, description: 'Holiday list created' })
  createList(@Body() dto: CreateHolidayListDto) {
    return this.service.createList(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all holiday lists with employee/holiday counts (HR only)',
  })
  @ApiResponse({ status: 200, description: 'Holiday lists retrieved' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter by year',
  })
  findAllLists(
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year: number
  ) {
    return this.service.findAllLists(year || undefined);
  }

  @Get('public-holidays/countries')
  @ApiOperation({
    summary: 'Get available countries for public holiday import (HR only)',
  })
  @ApiResponse({ status: 200, description: 'Countries retrieved' })
  async getAvailableCountries() {
    const data = await this.publicHolidaysService.getAvailableCountries();
    return { success: true, message: 'Available countries retrieved', data };
  }

  @Get('public-holidays/:countryCode/:year')
  @ApiOperation({
    summary: 'Preview public holidays for a country/year (HR only)',
  })
  @ApiResponse({ status: 200, description: 'Public holidays retrieved' })
  async getPublicHolidays(
    @Param('countryCode') countryCode: string,
    @Param('year', ParseIntPipe) year: number
  ) {
    const data = await this.publicHolidaysService.getPublicHolidays(
      year,
      countryCode
    );
    return {
      success: true,
      message: `Public holidays for ${countryCode.toUpperCase()} ${year} retrieved`,
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get holiday list with holidays (HR only)' })
  @ApiResponse({ status: 200, description: 'Holiday list retrieved' })
  findOneList(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOneList(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update holiday list (HR only)' })
  @ApiResponse({ status: 200, description: 'Holiday list updated' })
  updateList(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayListDto
  ) {
    return this.service.updateList(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete holiday list (HR only)' })
  @ApiResponse({ status: 200, description: 'Holiday list deleted' })
  removeList(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeList(id);
  }

  @Post(':listId/holidays')
  @ApiOperation({ summary: 'Add holiday to list (HR only)' })
  @ApiResponse({ status: 201, description: 'Holiday added' })
  addHoliday(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: CreateHolidayDto
  ) {
    return this.service.addHoliday(listId, dto);
  }

  @Post(':listId/holidays/bulk')
  @ApiOperation({ summary: 'Bulk add holidays to list (HR only)' })
  @ApiResponse({ status: 201, description: 'Holidays added' })
  addBulkHolidays(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: BulkCreateHolidaysDto
  ) {
    return this.service.addBulkHolidays(listId, dto);
  }

  @Post(':listId/holidays/import')
  @ApiOperation({
    summary: 'Import public holidays from country into list (HR only)',
  })
  @ApiResponse({ status: 201, description: 'Holidays imported' })
  importHolidays(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: ImportHolidaysDto
  ) {
    return this.service.importHolidays(listId, dto);
  }

  @Patch(':listId/holidays/:holidayId')
  @ApiOperation({ summary: 'Update holiday (HR only)' })
  @ApiResponse({ status: 200, description: 'Holiday updated' })
  updateHoliday(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('holidayId', ParseUUIDPipe) holidayId: string,
    @Body() dto: UpdateHolidayDto
  ) {
    return this.service.updateHoliday(listId, holidayId, dto);
  }

  @Delete(':listId/holidays/:holidayId')
  @ApiOperation({ summary: 'Remove holiday from list (HR only)' })
  @ApiResponse({ status: 200, description: 'Holiday removed' })
  removeHoliday(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('holidayId', ParseUUIDPipe) holidayId: string
  ) {
    return this.service.removeHoliday(listId, holidayId);
  }

  @Get(':listId/employees')
  @ApiOperation({
    summary: 'Get employees assigned to this holiday list (HR only)',
  })
  @ApiResponse({ status: 200, description: 'Employees retrieved' })
  getListEmployees(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Query() pagination: PaginationQueryDto
  ) {
    return this.service.getListEmployees(listId, pagination);
  }

  @Get(':listId/employees/unassigned')
  @ApiOperation({
    summary: 'Get employees not assigned to this holiday list (HR only)',
  })
  @ApiResponse({ status: 200, description: 'Unassigned employees retrieved' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, email, or employee number',
  })
  getUnassignedEmployees(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string
  ) {
    return this.service.getUnassignedEmployees(
      listId,
      pagination,
      search || undefined
    );
  }

  @Post(':listId/employees/assign')
  @ApiOperation({
    summary: 'Bulk assign employees to this holiday list (HR only)',
  })
  @ApiResponse({ status: 200, description: 'Employees assigned' })
  assignEmployees(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: AssignEmployeesDto
  ) {
    return this.service.assignEmployees(listId, dto.employeeIds);
  }

  @Post(':listId/employees/unassign')
  @ApiOperation({
    summary: 'Bulk unassign employees from this holiday list (HR only)',
  })
  @ApiResponse({ status: 200, description: 'Employees unassigned' })
  unassignEmployees(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: AssignEmployeesDto
  ) {
    return this.service.unassignEmployees(listId, dto.employeeIds);
  }
}
