import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { Holiday } from './entities/holiday.entity.js';
import { HolidayList } from './entities/holiday-list.entity.js';
import { HolidayListsController } from './holiday-lists.controller.js';
import { HolidayListsService } from './holiday-lists.service.js';
import { HolidaysController } from './holidays.controller.js';
import { PublicHolidaysService } from './public-holidays.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([HolidayList, Holiday, EmployeeProfile]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [HolidayListsController, HolidaysController],
  providers: [HolidayListsService, PublicHolidaysService],
  exports: [HolidayListsService],
})
export class HolidaysModule {}
