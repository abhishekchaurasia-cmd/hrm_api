import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class YearEndProcessingDto {
  @ApiProperty({
    description: 'The year whose balances to process (e.g. 2026)',
    example: 2026,
  })
  @IsInt()
  @Min(2020)
  @Max(2100)
  @IsNotEmpty()
  processingYear!: number;

  @ApiProperty({
    description: 'The new year to create balances for (e.g. 2027)',
    example: 2027,
  })
  @IsInt()
  @Min(2020)
  @Max(2100)
  @IsNotEmpty()
  newYear!: number;
}
