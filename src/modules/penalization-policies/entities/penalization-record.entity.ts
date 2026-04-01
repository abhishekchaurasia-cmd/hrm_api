import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { Attendance } from '../../attendance/entities/attendance.entity.js';
import type { User } from '../../users/entities/user.entity.js';
import type { PenalizationPolicyVersion } from './penalization-policy-version.entity.js';
import type { PenalizationRule } from './penalization-rule.entity.js';
import { DeductionMethod } from './penalization-policy-version.entity.js';
import { PenaltyType } from './penalization-rule.entity.js';

export enum PenalizationRecordStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  WAIVED = 'waived',
}

@Entity('penalization_records')
export class PenalizationRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  policyVersionId!: string;

  @ManyToOne('PenalizationPolicyVersion', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyVersionId' })
  policyVersion!: PenalizationPolicyVersion;

  @Column({ type: 'uuid' })
  ruleId!: string;

  @ManyToOne('PenalizationRule', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule!: PenalizationRule;

  @Index()
  @Column({ type: 'date' })
  incidentDate!: string;

  @Column({ type: 'date' })
  penaltyDate!: string;

  @Column({ type: 'enum', enum: PenaltyType })
  penaltyType!: PenaltyType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  deductionDays!: number;

  @Column({ type: 'enum', enum: DeductionMethod })
  deductionMethod!: DeductionMethod;

  @Column({
    type: 'enum',
    enum: PenalizationRecordStatus,
    default: PenalizationRecordStatus.PENDING,
  })
  status!: PenalizationRecordStatus;

  @Column({ type: 'uuid', nullable: true })
  attendanceId!: string | null;

  @ManyToOne('Attendance', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'attendanceId' })
  attendance?: Attendance;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
