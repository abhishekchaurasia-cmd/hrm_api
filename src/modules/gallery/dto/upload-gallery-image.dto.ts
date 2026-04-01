import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { GalleryCategory } from '../gallery-category.enum.js';

export class UploadGalleryImageDto {
  @ApiProperty({ enum: GalleryCategory })
  @IsEnum(GalleryCategory)
  category!: GalleryCategory;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alt?: string;
}
