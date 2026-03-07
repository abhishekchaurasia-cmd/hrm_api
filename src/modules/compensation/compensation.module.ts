import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Compensation } from './entities/compensation.entity.js';
import { SalaryBreakup } from './entities/salary-breakup.entity.js';
import { SalaryComponent } from './entities/salary-component.entity.js';

import { CompensationController } from './compensation.controller.js';
import { CompensationService } from './compensation.service.js';
import { SalaryComponentsController } from './salary-components.controller.js';
import { SalaryComponentsService } from './salary-components.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compensation, SalaryBreakup, SalaryComponent]),
  ],
  controllers: [SalaryComponentsController, CompensationController],
  providers: [SalaryComponentsService, CompensationService],
  exports: [SalaryComponentsService, CompensationService],
})
export class CompensationModule {}
