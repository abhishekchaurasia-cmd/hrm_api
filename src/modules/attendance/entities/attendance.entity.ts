import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import type { Shift } from '../../shifts/entities/shift.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  HALF_DAY = 'half_day',
  ABSENT = 'absent',
}

@Entity('attendance')
@Unique('UQ_attendance_user_work_date', ['userId', 'workDate'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, user => user.attendanceRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid', nullable: true })
  shiftId!: string | null;

  @ManyToOne('Shift', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shiftId' })
  shift?: Shift;

  @Index()
  @Column({ type: 'date' })
  workDate!: string;

  @Column({ type: 'timestamp', nullable: true })
  punchInAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  punchOutAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  totalMinutes!: number | null;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status!: AttendanceStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
