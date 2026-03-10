import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Compensation } from '../compensation/entities/compensation.entity.js';
import { LeavePlanAssignment } from '../leave-policies/entities/leave-plan-assignment.entity.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { EmployeeProfilesController } from './employee-profiles.controller.js';
import { EmployeeProfilesService } from './employee-profiles.service.js';
import { EmployeeProfile } from './entities/employee-profile.entity.js';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      EmployeeProfile,
      Compensation,
      ShiftAssignment,
      LeavePlanAssignment,
    ]),
  ],
  controllers: [UsersController, EmployeeProfilesController],
  providers: [UsersService, EmployeeProfilesService],
  exports: [UsersService, EmployeeProfilesService],
})
export class UsersModule {}
