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
import { CreateLegalEntityDto } from './dto/create-legal-entity.dto.js';
import { LegalEntitiesService } from './legal-entities.service.js';

@ApiTags('legal-entities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/legal-entities')
export class LegalEntitiesController {
  constructor(private readonly service: LegalEntitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create legal entity (HR only)' })
  @ApiResponse({ status: 201, description: 'Legal entity created' })
  create(@Body() dto: CreateLegalEntityDto) {
    return this.service.create(dto);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get legal entity options for dropdowns (HR only)' })
  @ApiResponse({ status: 200, description: 'Legal entity options retrieved' })
  findAllOptions() {
    return this.service.findAllOptions();
  }

  @Get()
  @ApiOperation({ summary: 'List all legal entities (HR only)' })
  @ApiResponse({ status: 200, description: 'Legal entities retrieved' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get legal entity by ID (HR only)' })
  @ApiResponse({ status: 200, description: 'Legal entity retrieved' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update legal entity (HR only)' })
  @ApiResponse({ status: 200, description: 'Legal entity updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLegalEntityDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate legal entity (HR only)' })
  @ApiResponse({ status: 200, description: 'Legal entity deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
