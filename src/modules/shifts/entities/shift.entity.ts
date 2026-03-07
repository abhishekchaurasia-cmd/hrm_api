import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { ShiftAssignment } from './shift-assignment.entity.js';
import type { ShiftWeeklyOff } from './shift-weekly-off.entity.js';

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index()
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({ type: 'int', default: 0 })
  breakDurationMinutes!: number;

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  workHoursPerDay!: number;

  @Column({ type: 'boolean', default: false })
  isFlexible!: boolean;

  @Column({ type: 'int', default: 0 })
  graceMinutes!: number;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany('ShiftWeeklyOff', (weeklyOff: ShiftWeeklyOff) => weeklyOff.shift)
  weeklyOffs?: ShiftWeeklyOff[];

  @OneToMany(
    'ShiftAssignment',
    (assignment: ShiftAssignment) => assignment.shift
  )
  assignments?: ShiftAssignment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
