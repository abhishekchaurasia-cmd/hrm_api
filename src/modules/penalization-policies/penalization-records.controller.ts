import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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

import { QueryPenalizationRecordsDto } from './dto/query-penalization-records.dto.js';
import { PenalizationRecordsService } from './penalization-records.service.js';

@ApiTags('penalization-records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/penalization-records')
export class PenalizationRecordsController {
  constructor(private readonly recordsService: PenalizationRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List penalization records with filters (HR only)' })
  @ApiResponse({ status: 200, description: 'Records retrieved' })
  findAll(@Query() query: QueryPenalizationRecordsDto) {
    return this.recordsService.findAll(query);
  }

  @Patch(':id/waive')
  @ApiOperation({ summary: 'Waive a penalty record (HR only)' })
  @ApiResponse({ status: 200, description: 'Penalty waived' })
  waive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('remarks') remarks?: string
  ) {
    return this.recordsService.waive(id, remarks);
  }

  @Post('evaluate/:userId/:date')
  @ApiOperation({
    summary: 'Evaluate penalties for a user on a date (HR only)',
  })
  @ApiResponse({ status: 201, description: 'Penalties evaluated' })
  evaluate(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('date') date: string
  ) {
    return this.recordsService.evaluateAndCreatePenalties(userId, date);
  }
}
