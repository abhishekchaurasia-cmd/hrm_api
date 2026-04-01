import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class GeneratePayrollReportDto {
  @ApiProperty({ description: 'Month (1-12)', example: 3 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Year', example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;
}
