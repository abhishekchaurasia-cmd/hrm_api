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

import type { User } from '../../users/entities/user.entity.js';
import type { LeavePlan } from './leave-plan.entity.js';

@Entity('leave_plan_assignments')
export class LeavePlanAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  leavePlanId!: string;

  @ManyToOne('LeavePlan', (plan: LeavePlan) => plan.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leavePlanId' })
  leavePlan!: LeavePlan;

  @Column({ type: 'date' })
  effectiveFrom!: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo!: string | null;

  @Column({ type: 'uuid' })
  assignedBy!: string;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignedBy' })
  assignedByUser?: User;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
