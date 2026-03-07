import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LeavePoliciesModule } from '../leave-policies/leave-policies.module.js';
import { ShiftsModule } from '../shifts/shifts.module.js';

import { Leave } from './entities/leave.entity.js';
import { LeavesController } from './leaves.controller.js';
import { LeavesService } from './leaves.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Leave]),
    LeavePoliciesModule,
    ShiftsModule,
  ],
  controllers: [LeavesController],
  providers: [LeavesService],
  exports: [LeavesService],
})
export class LeavesModule {}
