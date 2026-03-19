import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Attendance } from '../attendance/entities/attendance.entity.js';
import { TimeTrackingPoliciesModule } from '../time-tracking-policies/time-tracking-policies.module.js';

import { RegularizationRequest } from './entities/regularization-request.entity.js';
import { RegularizationsController } from './regularizations.controller.js';
import { RegularizationsService } from './regularizations.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegularizationRequest, Attendance]),
    TimeTrackingPoliciesModule,
  ],
  controllers: [RegularizationsController],
  providers: [RegularizationsService, RolesGuard],
  exports: [RegularizationsService],
})
export class RegularizationsModule {}
