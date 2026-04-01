import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class WebClockInSettingsDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  commentMandatory!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  ipRestrictionEnabled!: boolean;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIPs?: string[];
}

export class RemoteClockInSettingsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  capturesLocation!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  ipRestrictionEnabled!: boolean;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIPs?: string[];
}

export class MobileClockInSettingsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  enabled!: boolean;
}

export class CaptureSettingsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  biometricEnabled!: boolean;

  @ApiProperty({ type: WebClockInSettingsDto })
  @ValidateNested()
  @Type(() => WebClockInSettingsDto)
  webClockIn!: WebClockInSettingsDto;

  @ApiProperty({ type: RemoteClockInSettingsDto })
  @ValidateNested()
  @Type(() => RemoteClockInSettingsDto)
  remoteClockIn!: RemoteClockInSettingsDto;

  @ApiProperty({ type: MobileClockInSettingsDto })
  @ValidateNested()
  @Type(() => MobileClockInSettingsDto)
  mobileClockIn!: MobileClockInSettingsDto;
}
