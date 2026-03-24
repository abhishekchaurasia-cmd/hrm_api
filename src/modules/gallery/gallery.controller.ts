import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';

import { GalleryCategory } from './gallery-category.enum.js';
import { UploadGalleryImageDto } from './dto/upload-gallery-image.dto.js';
import { GalleryService } from './gallery.service.js';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'gallery');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@ApiTags('gallery')
@Controller('api/v1/gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @ApiOperation({ summary: 'List all gallery images (public)' })
  @ApiQuery({ name: 'category', required: false, enum: GalleryCategory })
  @ApiResponse({ status: 200, description: 'Gallery images retrieved' })
  findAll(@Query('category') category?: GalleryCategory) {
    return this.galleryService.findAll(category);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPEG, PNG, and WebP files are allowed'), false);
        }
      },
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'category'],
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', enum: Object.values(GalleryCategory) },
        alt: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a gallery image (HR only)' })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadGalleryImageDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.galleryService.upload(file, dto, user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Delete a gallery image (HR only)' })
  @ApiResponse({ status: 200, description: 'Image deleted' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.galleryService.remove(id);
  }
}
