import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { PayrollReportDetail } from './payroll-report-detail.entity.js';

export enum DayType {
  WORKING = 'working',
  WEEKLY_OFF = 'weekly_off',
  HOLIDAY = 'holiday',
  LEAVE = 'leave',
}

@Entity('payroll_daily_details')
export class PayrollDailyDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  reportDetailId!: string;

  @ManyToOne(
    'PayrollReportDetail',
    (detail: PayrollReportDetail) => detail.dailyDetails,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'reportDetailId' })
  reportDetail!: PayrollReportDetail;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'date' })
  workDate!: string;

  @Column({ type: 'enum', enum: DayType, default: DayType.WORKING })
  dayType!: DayType;

  @Column({ type: 'timestamp', nullable: true })
  punchInAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  punchOutAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  totalMinutes!: number | null;

  @Column({ type: 'int', nullable: true })
  effectiveMinutes!: number | null;

  @Column({ type: 'int', nullable: true })
  lateByMinutes!: number | null;

  @Column({ type: 'int', nullable: true })
  earlyLeaveMinutes!: number | null;

  @Column({ type: 'int', nullable: true })
  overtimeMinutes!: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  status!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shiftName!: string | null;

  @Column({ type: 'boolean', default: false })
  isAutoLogout!: boolean;

  @Column({ type: 'boolean', default: false })
  penaltyApplied!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  leaveType!: string | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
