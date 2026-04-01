import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GalleryImage } from './entities/gallery-image.entity.js';
import { GalleryController } from './gallery.controller.js';
import { GalleryService } from './gallery.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([GalleryImage])],
  controllers: [GalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
