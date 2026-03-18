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

import type { User } from '../../users/entities/user.entity.js';
import type { TimeTrackingPolicy } from './time-tracking-policy.entity.js';

@Entity('time_tracking_policy_assignments')
@Unique('UQ_time_tracking_assignment_policy_user', ['policyId', 'userId'])
export class TimeTrackingPolicyAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  policyId!: string;

  @ManyToOne(
    'TimeTrackingPolicy',
    (policy: TimeTrackingPolicy) => policy.assignments,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'policyId' })
  policy!: TimeTrackingPolicy;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  assignedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  unassignedAt!: Date | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
