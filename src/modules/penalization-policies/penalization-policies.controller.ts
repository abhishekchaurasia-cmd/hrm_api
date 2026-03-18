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

import { CreatePenalizationPolicyDto } from './dto/create-penalization-policy.dto.js';
import { UpdatePenalizationPolicyDto } from './dto/update-penalization-policy.dto.js';
import { PenalizationPoliciesService } from './penalization-policies.service.js';

@ApiTags('penalization-policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/penalization-policies')
export class PenalizationPoliciesController {
  constructor(private readonly policiesService: PenalizationPoliciesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a penalization policy (HR only)' })
  @ApiResponse({ status: 201, description: 'Policy created' })
  create(@Body() dto: CreatePenalizationPolicyDto) {
    return this.policiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all penalization policies (HR only)' })
  @ApiResponse({ status: 200, description: 'Policies retrieved' })
  findAll() {
    return this.policiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get penalization policy details (HR only)' })
  @ApiResponse({ status: 200, description: 'Policy retrieved' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.policiesService.findOne(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions of a policy (HR only)' })
  @ApiResponse({ status: 200, description: 'Versions retrieved' })
  findVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.policiesService.findVersions(id);
  }

  @Get(':id/versions/:versionId')
  @ApiOperation({ summary: 'Get specific version of a policy (HR only)' })
  @ApiResponse({ status: 200, description: 'Version retrieved' })
  findVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string
  ) {
    return this.policiesService.findVersion(id, versionId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a penalization policy (HR only)' })
  @ApiResponse({ status: 200, description: 'Policy updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePenalizationPolicyDto
  ) {
    return this.policiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a penalization policy (HR only)' })
  @ApiResponse({ status: 200, description: 'Policy deactivated' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.policiesService.remove(id);
  }
}
