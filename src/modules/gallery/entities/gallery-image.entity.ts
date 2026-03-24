import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { User } from '../../users/entities/user.entity.js';
import { GalleryCategory } from '../gallery-category.enum.js';

@Entity('gallery_images')
export class GalleryImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: GalleryCategory })
  category!: GalleryCategory;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({ type: 'varchar', length: 255 })
  originalFilename!: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ type: 'int' })
  sizeBytes!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  alt!: string | null;

  @Column({ type: 'uuid', nullable: true })
  uploadedById!: string | null;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy?: User;

  @CreateDateColumn()
  createdAt!: Date;
}
