import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { UserRole } from '../users/entities/user.entity.js';
import { OnboardEmployeeDto } from './dto/onboard-employee.dto.js';
import { EmployeeOnboardingService } from './employee-onboarding.service.js';

@ApiTags('employee-onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR)
@Controller('api/v1/employee-onboarding')
export class EmployeeOnboardingController {
  constructor(private readonly service: EmployeeOnboardingService) {}

  @Post()
  @ApiOperation({
    summary: 'Onboard a new employee (HR only) - multi-step wizard in one call',
  })
  @ApiResponse({ status: 201, description: 'Employee onboarded successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  onboard(
    @CurrentUser() currentUser: AuthUser,
    @Body() dto: OnboardEmployeeDto
  ) {
    return this.service.onboard(currentUser, dto);
  }
}
