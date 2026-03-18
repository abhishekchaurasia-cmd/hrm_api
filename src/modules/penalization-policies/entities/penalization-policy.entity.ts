import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { PenalizationPolicyAssignment } from './penalization-policy-assignment.entity.js';
import type { PenalizationPolicyVersion } from './penalization-policy-version.entity.js';

@Entity('penalization_policies')
export class PenalizationPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(
    'PenalizationPolicyVersion',
    (version: PenalizationPolicyVersion) => version.policy
  )
  versions?: PenalizationPolicyVersion[];

  @OneToMany(
    'PenalizationPolicyAssignment',
    (assignment: PenalizationPolicyAssignment) => assignment.policy
  )
  assignments?: PenalizationPolicyAssignment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
