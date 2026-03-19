import {
  Body,
  Controller,
  DefaultValuePipe,
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

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { UserRole } from '../users/entities/user.entity.js';

import { ApproveRejectRegularizationDto } from './dto/approve-reject-regularization.dto.js';
import { CreateRegularizationDto } from './dto/create-regularization.dto.js';
import { HrRegularizationsQueryDto } from './dto/hr-regularizations-query.dto.js';
import { RegularizationStatus } from './entities/regularization-request.entity.js';
import { RegularizationsService } from './regularizations.service.js';

@ApiTags('regularizations')
@ApiBearerAuth()
@Controller()
export class RegularizationsController {
  constructor(
    private readonly regularizationsService: RegularizationsService
  ) {}

  @Post('api/v1/regularizations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a regularization request' })
  @ApiResponse({ status: 201, description: 'Regularization request created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRegularizationDto) {
    return this.regularizationsService.create(user, dto);
  }

  @Get('api/v1/regularizations/me/remaining')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get remaining regularization entries for current period',
  })
  @ApiResponse({
    status: 200,
    description: 'Remaining entries retrieved',
  })
  getRemainingEntries(@CurrentUser() user: AuthUser) {
    return this.regularizationsService.getRemainingEntries(user);
  }

  @Get('api/v1/regularizations/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get my regularization requests with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Regularization requests retrieved',
  })
  @ApiQuery({ name: 'status', required: false, enum: RegularizationStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyRegularizations(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: RegularizationStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
  ) {
    return this.regularizationsService.getMyRegularizations(user, {
      status,
      page,
      limit,
    });
  }

  @Get('api/v1/hr/regularizations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({
    summary: 'Get all regularization requests with filtering (HR only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Regularization requests retrieved',
  })
  getHrRegularizations(@Query() query: HrRegularizationsQueryDto) {
    return this.regularizationsService.getHrRegularizations(query);
  }

  @Patch('api/v1/regularizations/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Approve a regularization request (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Regularization request approved',
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRejectRegularizationDto
  ) {
    return this.regularizationsService.approve(user, id, dto);
  }

  @Patch('api/v1/regularizations/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Reject a regularization request (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Regularization request rejected',
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRejectRegularizationDto
  ) {
    return this.regularizationsService.reject(user, id, dto);
  }

  @Patch('api/v1/regularizations/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel own regularization request' })
  @ApiResponse({
    status: 200,
    description: 'Regularization request cancelled',
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.regularizationsService.cancel(user, id);
  }
}
