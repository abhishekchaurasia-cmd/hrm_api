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
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto.js';
import { BusinessUnitsService } from './business-units.service.js';

@ApiTags('business-units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/business-units')
export class BusinessUnitsController {
  constructor(private readonly service: BusinessUnitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create business unit (HR only)' })
  @ApiResponse({ status: 201, description: 'Business unit created' })
  create(@Body() dto: CreateBusinessUnitDto) {
    return this.service.create(dto);
  }

  @Get('options')
  @ApiOperation({
    summary: 'Get business unit options for dropdowns (HR only)',
  })
  @ApiResponse({ status: 200, description: 'Business unit options retrieved' })
  findAllOptions() {
    return this.service.findAllOptions();
  }

  @Get()
  @ApiOperation({ summary: 'List all business units (HR only)' })
  @ApiResponse({ status: 200, description: 'Business units retrieved' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business unit by ID (HR only)' })
  @ApiResponse({ status: 200, description: 'Business unit retrieved' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update business unit (HR only)' })
  @ApiResponse({ status: 200, description: 'Business unit updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBusinessUnitDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate business unit (HR only)' })
  @ApiResponse({ status: 200, description: 'Business unit deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
