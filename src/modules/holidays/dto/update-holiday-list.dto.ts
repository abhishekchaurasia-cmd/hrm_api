import { PartialType } from '@nestjs/swagger';
import { CreateHolidayListDto } from './create-holiday-list.dto.js';

export class UpdateHolidayListDto extends PartialType(CreateHolidayListDto) {}
