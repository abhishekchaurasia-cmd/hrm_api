import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { CreateCompensationDto } from './dto/create-compensation.dto.js';
import { SetSalaryBreakupDto } from './dto/set-salary-breakup.dto.js';
import { UpdateCompensationDto } from './dto/update-compensation.dto.js';
import { CompensationService } from './compensation.service.js';

@ApiTags('compensations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/compensations')
export class CompensationController {
  constructor(private readonly service: CompensationService) {}

  @Post()
  @ApiOperation({ summary: 'Create employee compensation (HR only)' })
  @ApiResponse({ status: 201, description: 'Compensation created' })
  create(@Body() dto: CreateCompensationDto) {
    return this.service.create(dto);
  }

  @Get('employee/:userId')
  @ApiOperation({ summary: 'Get employee compensation (HR only)' })
  @ApiResponse({ status: 200, description: 'Compensation retrieved' })
  findByEmployee(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.service.findByEmployee(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update compensation (HR only)' })
  @ApiResponse({ status: 200, description: 'Compensation updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompensationDto
  ) {
    return this.service.update(id, dto);
  }

  @Get(':id/breakup')
  @ApiOperation({ summary: 'Get salary breakup (HR only)' })
  @ApiResponse({ status: 200, description: 'Salary breakup retrieved' })
  getBreakup(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getBreakup(id);
  }

  @Put(':id/breakup')
  @ApiOperation({ summary: 'Set salary breakup (replaces all) (HR only)' })
  @ApiResponse({ status: 200, description: 'Salary breakup set' })
  setBreakup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSalaryBreakupDto
  ) {
    return this.service.setBreakup(id, dto);
  }
}
