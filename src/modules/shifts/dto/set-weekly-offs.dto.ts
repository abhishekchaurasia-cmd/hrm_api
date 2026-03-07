import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class WeeklyOffItemDto {
  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    description: 'Full day off or half day',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isFullDay?: boolean;
}

export class SetWeeklyOffsDto {
  @ApiProperty({
    description: 'List of weekly off days',
    type: [WeeklyOffItemDto],
  })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WeeklyOffItemDto)
  weeklyOffs!: WeeklyOffItemDto[];
}
