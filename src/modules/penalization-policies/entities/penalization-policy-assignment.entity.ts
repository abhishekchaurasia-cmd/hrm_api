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
import type { PenalizationPolicy } from './penalization-policy.entity.js';

@Entity('penalization_policy_assignments')
@Unique('UQ_penalization_assignment_policy_user', ['policyId', 'userId'])
export class PenalizationPolicyAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  policyId!: string;

  @ManyToOne(
    'PenalizationPolicy',
    (policy: PenalizationPolicy) => policy.assignments,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'policyId' })
  policy!: PenalizationPolicy;

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
