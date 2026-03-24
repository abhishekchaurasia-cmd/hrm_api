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
import { CreateLocationDto } from './dto/create-location.dto.js';
import { LocationsService } from './locations.service.js';

@ApiTags('locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create location (HR only)' })
  @ApiResponse({ status: 201, description: 'Location created' })
  create(@Body() dto: CreateLocationDto) {
    return this.service.create(dto);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get location options for dropdowns (HR only)' })
  @ApiResponse({ status: 200, description: 'Location options retrieved' })
  findAllOptions() {
    return this.service.findAllOptions();
  }

  @Get()
  @ApiOperation({ summary: 'List all locations (HR only)' })
  @ApiResponse({ status: 200, description: 'Locations retrieved' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID (HR only)' })
  @ApiResponse({ status: 200, description: 'Location retrieved' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update location (HR only)' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLocationDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate location (HR only)' })
  @ApiResponse({ status: 200, description: 'Location deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
