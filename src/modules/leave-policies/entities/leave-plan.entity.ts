import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { LeavePlanAssignment } from './leave-plan-assignment.entity.js';
import type { LeaveTypeConfig } from './leave-type-config.entity.js';

@Entity('leave_plans')
export class LeavePlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany('LeaveTypeConfig', (config: LeaveTypeConfig) => config.leavePlan)
  leaveTypeConfigs?: LeaveTypeConfig[];

  @OneToMany(
    'LeavePlanAssignment',
    (assignment: LeavePlanAssignment) => assignment.leavePlan
  )
  assignments?: LeavePlanAssignment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
