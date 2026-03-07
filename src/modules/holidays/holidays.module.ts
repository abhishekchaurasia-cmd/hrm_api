import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Holiday } from './entities/holiday.entity.js';
import { HolidayList } from './entities/holiday-list.entity.js';
import { HolidayListsController } from './holiday-lists.controller.js';
import { HolidayListsService } from './holiday-lists.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([HolidayList, Holiday])],
  controllers: [HolidayListsController],
  providers: [HolidayListsService],
  exports: [HolidayListsService],
})
export class HolidaysModule {}
