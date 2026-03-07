import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import type { Compensation } from './compensation.entity.js';
import type { SalaryComponent } from './salary-component.entity.js';

@Entity('salary_breakups')
@Unique(['compensationId', 'salaryComponentId'])
export class SalaryBreakup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  compensationId!: string;

  @ManyToOne('Compensation', (c: Compensation) => c.breakups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'compensationId' })
  compensation?: Compensation;

  @Column({ type: 'uuid' })
  salaryComponentId!: string;

  @ManyToOne('SalaryComponent', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'salaryComponentId' })
  salaryComponent?: SalaryComponent;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  annualAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monthlyAmount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
