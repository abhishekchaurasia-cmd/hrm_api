import {
  Body,
  Controller,
  Delete,
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

import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { CreateHolidayDto } from './dto/create-holiday.dto.js';
import { CreateHolidayListDto } from './dto/create-holiday-list.dto.js';
import { UpdateHolidayDto } from './dto/update-holiday.dto.js';
import { UpdateHolidayListDto } from './dto/update-holiday-list.dto.js';
import { HolidayListsService } from './holiday-lists.service.js';

@ApiTags('holiday-lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/holiday-lists')
export class HolidayListsController {
  constructor(private readonly service: HolidayListsService) {}

  @Post()
  @ApiOperation({ summary: 'Create holiday list (HR only)' })
  @ApiResponse({ status: 201, description: 'Holiday list created' })
  createList(@Body() dto: CreateHolidayListDto) {
    return this.service.createList(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all holiday lists (HR only)' })
  @ApiResponse({ status: 200, description: 'Holiday lists retrieved' })
  findAllLists() {
    return this.service.findAllLists();
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
  @ApiOperation({ summary: 'Deactivate holiday list (HR only)' })
  @ApiResponse({ status: 200, description: 'Holiday list deactivated' })
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
}
