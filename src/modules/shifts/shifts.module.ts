import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { User } from '../users/entities/user.entity.js';

import { ShiftAssignment } from './entities/shift-assignment.entity.js';
import { ShiftWeeklyOff } from './entities/shift-weekly-off.entity.js';
import { Shift } from './entities/shift.entity.js';
import { ShiftAssignmentsController } from './shift-assignments.controller.js';
import { ShiftAssignmentsService } from './shift-assignments.service.js';
import { ShiftsController } from './shifts.controller.js';
import { ShiftsService } from './shifts.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftWeeklyOff, ShiftAssignment, User]),
  ],
  controllers: [ShiftsController, ShiftAssignmentsController],
  providers: [ShiftsService, ShiftAssignmentsService, RolesGuard],
  exports: [ShiftsService, ShiftAssignmentsService],
})
export class ShiftsModule {}
