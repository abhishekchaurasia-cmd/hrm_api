import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { User } from '../../users/entities/user.entity.js';
import type { PayrollReport } from './payroll-report.entity.js';
import type { PayrollDailyDetail } from './payroll-daily-detail.entity.js';

@Entity('payroll_report_details')
export class PayrollReportDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  reportId!: string;

  @ManyToOne('PayrollReport', (report: PayrollReport) => report.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reportId' })
  report!: PayrollReport;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  employeeName!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  employeeNumber!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department!: string | null;

  @Column({ type: 'int', default: 0 })
  totalWorkingDays!: number;

  @Column({ type: 'int', default: 0 })
  totalPresentDays!: number;

  @Column({ type: 'int', default: 0 })
  totalLateDays!: number;

  @Column({ type: 'int', default: 0 })
  totalAbsentDays!: number;

  @Column({ type: 'int', default: 0 })
  totalHalfDays!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  totalPaidLeaveDays!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  totalUnpaidLeaveDays!: number;

  @Column({ type: 'int', default: 0 })
  totalWeeklyOffDays!: number;

  @Column({ type: 'int', default: 0 })
  totalHolidayDays!: number;

  @Column({ type: 'int', default: 0 })
  totalWorkedMinutes!: number;

  @Column({ type: 'int', default: 0 })
  totalEffectiveMinutes!: number;

  @Column({ type: 'int', default: 0 })
  totalOvertimeMinutes!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalPenaltyDeductionDays!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  lopDays!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  netPayableDays!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grossMonthlySalary!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deductions!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netPayable!: number;

  @OneToMany(
    'PayrollDailyDetail',
    (daily: PayrollDailyDetail) => daily.reportDetail
  )
  dailyDetails?: PayrollDailyDetail[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
