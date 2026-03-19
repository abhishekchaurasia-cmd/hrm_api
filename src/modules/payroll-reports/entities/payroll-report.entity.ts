import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import type { User } from '../../users/entities/user.entity.js';
import type { PayrollReportDetail } from './payroll-report-detail.entity.js';

export enum PayrollReportStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
}

@Entity('payroll_reports')
@Unique('UQ_payroll_report_month_year', ['month', 'year'])
export class PayrollReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'int' })
  month!: number;

  @Index()
  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'timestamp' })
  generatedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  generatedBy!: string | null;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'generatedBy' })
  generator?: User;

  @Column({
    type: 'enum',
    enum: PayrollReportStatus,
    default: PayrollReportStatus.DRAFT,
  })
  status!: PayrollReportStatus;

  @Column({ type: 'int', default: 0 })
  totalEmployees!: number;

  @Column({ type: 'int', default: 0 })
  totalWorkingDays!: number;

  @OneToMany(
    'PayrollReportDetail',
    (detail: PayrollReportDetail) => detail.report
  )
  details?: PayrollReportDetail[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
