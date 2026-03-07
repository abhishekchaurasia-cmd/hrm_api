import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { LegalEntity } from './legal-entity.entity.js';

@Entity('business_units')
export class BusinessUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId!: string | null;

  @ManyToOne('LegalEntity', (le: LegalEntity) => le.businessUnits, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntity;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
