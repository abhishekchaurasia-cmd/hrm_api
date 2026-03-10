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
import type { LeaveTypeConfig } from '../../leave-policies/entities/leave-type-config.entity.js';
import type { User } from '../../users/entities/user.entity.js';

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  PERSONAL = 'personal',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  UNPAID = 'unpaid',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('leaves')
export class Leave {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', (user: User) => user.leaveRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'enum', enum: LeaveType, nullable: true })
  leaveType!: LeaveType | null;

  @Column({ type: 'uuid', nullable: true })
  leaveTypeConfigId!: string | null;

  @ManyToOne('LeaveTypeConfig', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'leaveTypeConfigId' })
  leaveTypeConfig?: LeaveTypeConfig;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  numberOfDays!: number | null;

  @Index()
  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'boolean', default: false })
  isHalfDay!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  halfDayType!: string | null;

  @Column({
    type: 'enum',
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status!: LeaveStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ type: 'text', nullable: true })
  reviewNote!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
