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

export enum RegularizationRequestType {
  MISSED_PUNCH_IN = 'missed_punch_in',
  MISSED_PUNCH_OUT = 'missed_punch_out',
  INCORRECT_TIME = 'incorrect_time',
  FORGOT_TO_PUNCH = 'forgot_to_punch',
  OTHER = 'other',
}

export enum RegularizationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('regularization_requests')
export class RegularizationRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', (user: User) => user.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid', nullable: true })
  attendanceId!: string | null;

  @ManyToOne('Attendance', (attendance: Attendance) => attendance.id, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'attendanceId' })
  attendance?: Attendance;

  @Index()
  @Column({ type: 'date' })
  requestDate!: string;

  @Column({ type: 'timestamp', nullable: true })
  originalPunchIn!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  originalPunchOut!: Date | null;

  @Column({ type: 'timestamp' })
  requestedPunchIn!: Date;

  @Column({ type: 'timestamp' })
  requestedPunchOut!: Date;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({
    type: 'enum',
    enum: RegularizationRequestType,
    default: RegularizationRequestType.OTHER,
  })
  requestType!: RegularizationRequestType;

  @Column({
    type: 'enum',
    enum: RegularizationStatus,
    default: RegularizationStatus.PENDING,
  })
  status!: RegularizationStatus;

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
