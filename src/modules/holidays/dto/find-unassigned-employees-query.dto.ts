import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class FindUnassignedEmployeesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name, email, or employee number',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
