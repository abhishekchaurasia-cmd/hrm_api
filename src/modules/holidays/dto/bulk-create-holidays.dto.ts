import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';

import { CreateHolidayDto } from './create-holiday.dto.js';

export class BulkCreateHolidaysDto {
  @ApiProperty({
    description: 'Array of holidays to add',
    type: [CreateHolidayDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateHolidayDto)
  holidays!: CreateHolidayDto[];
}
