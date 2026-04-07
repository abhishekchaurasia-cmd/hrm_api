import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class LeaveBalanceOverviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by year', example: 2026 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  year?: number;

  @ApiPropertyOptional({ description: 'Search by employee name' })
  @IsOptional()
  @IsString()
  search?: string;
}
