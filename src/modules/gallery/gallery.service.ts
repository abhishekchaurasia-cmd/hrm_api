import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { GalleryCategory } from './gallery-category.enum.js';
import { GalleryImage } from './entities/gallery-image.entity.js';
import type { UploadGalleryImageDto } from './dto/upload-gallery-image.dto.js';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'gallery');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryImage)
    private readonly galleryRepo: Repository<GalleryImage>
  ) {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  getUploadDir(): string {
    return UPLOAD_DIR;
  }

  async findAll(
    category?: GalleryCategory
  ): Promise<ApiResponse<GalleryImage[]>> {
    const where = category ? { category } : {};
    const images = await this.galleryRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return { success: true, message: 'Gallery images retrieved', data: images };
  }

  async upload(
    file: Express.Multer.File,
    dto: UploadGalleryImageDto,
    uploadedById: string
  ): Promise<ApiResponse<GalleryImage>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5 MB limit.');
    }

    const image = this.galleryRepo.create({
      category: dto.category,
      filename: file.filename,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      alt: dto.alt ?? null,
      uploadedById,
    });

    const saved = await this.galleryRepo.save(image);
    return { success: true, message: 'Image uploaded', data: saved };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const image = await this.galleryRepo.findOne({ where: { id } });
    if (!image) {
      throw new NotFoundException(`Gallery image with ID "${id}" not found`);
    }

    const filePath = join(UPLOAD_DIR, image.filename);
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // File may already be missing; proceed with DB removal
    }

    await this.galleryRepo.remove(image);
    return { success: true, message: 'Image deleted', data: null };
  }
}
