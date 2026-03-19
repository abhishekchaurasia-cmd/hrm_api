import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
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

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { CreateShiftDto } from './dto/create-shift.dto.js';
import { SetWeeklyOffsDto } from './dto/set-weekly-offs.dto.js';
import { UpdateShiftDto } from './dto/update-shift.dto.js';
import { ShiftsService } from './shifts.service.js';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shift (HR only)' })
  @ApiResponse({ status: 201, description: 'Shift created' })
  create(@Body() dto: CreateShiftDto) {
    return this.shiftsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active shifts (HR only)' })
  @ApiResponse({ status: 200, description: 'Shifts retrieved' })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.shiftsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift details (HR only)' })
  @ApiResponse({ status: 200, description: 'Shift retrieved' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift (HR only)' })
  @ApiResponse({ status: 200, description: 'Shift updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateShiftDto) {
    return this.shiftsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a shift (HR only)' })
  @ApiResponse({ status: 200, description: 'Shift deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.remove(id);
  }

  @Put(':id/weekly-offs')
  @ApiOperation({ summary: 'Set weekly off pattern for a shift (HR only)' })
  @ApiResponse({ status: 200, description: 'Weekly offs updated' })
  setWeeklyOffs(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetWeeklyOffsDto
  ) {
    return this.shiftsService.setWeeklyOffs(id, dto);
  }
}
