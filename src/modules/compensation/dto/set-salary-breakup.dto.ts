import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalaryBreakupItemDto {
  @ApiProperty({ description: 'Salary component ID' })
  @IsUUID()
  salaryComponentId!: string;

  @ApiProperty({
    description: 'Annual amount for this component',
    example: 480000,
  })
  @IsNumber()
  @Min(0)
  annualAmount!: number;
}

export class SetSalaryBreakupDto {
  @ApiProperty({ type: [SalaryBreakupItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalaryBreakupItemDto)
  breakup!: SalaryBreakupItemDto[];
}
