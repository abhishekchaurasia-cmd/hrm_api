import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import type { Shift } from './shift.entity.js';

@Entity('shift_weekly_offs')
@Unique('UQ_shift_weekly_off_shift_day', ['shiftId', 'dayOfWeek'])
export class ShiftWeeklyOff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  shiftId!: string;

  @ManyToOne('Shift', (shift: Shift) => shift.weeklyOffs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shiftId' })
  shift!: Shift;

  /** 0 = Sunday, 1 = Monday, ..., 6 = Saturday */
  @Column({ type: 'smallint' })
  dayOfWeek!: number;

  @Column({ type: 'boolean', default: true })
  isFullDay!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
