import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ShiftsModule } from '../shifts/shifts.module.js';
import { User } from '../users/entities/user.entity.js';

import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';
import { Attendance } from './entities/attendance.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, User]), ShiftsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, RolesGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}
