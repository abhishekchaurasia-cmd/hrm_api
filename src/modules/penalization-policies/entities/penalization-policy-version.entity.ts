import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { PenalizationPolicy } from './penalization-policy.entity.js';
import type { PenalizationRule } from './penalization-rule.entity.js';

export enum DeductionMethod {
  LOSS_OF_PAY = 'loss_of_pay',
  PAID_LEAVE = 'paid_leave',
}

@Entity('penalization_policy_versions')
export class PenalizationPolicyVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  policyId!: string;

  @ManyToOne(
    'PenalizationPolicy',
    (policy: PenalizationPolicy) => policy.versions,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'policyId' })
  policy!: PenalizationPolicy;

  @Column({ type: 'int' })
  versionNumber!: number;

  @Column({ type: 'date' })
  effectiveFrom!: string;

  @Column({
    type: 'enum',
    enum: DeductionMethod,
    default: DeductionMethod.LOSS_OF_PAY,
  })
  deductionMethod!: DeductionMethod;

  @Column({ type: 'int', default: 0 })
  bufferPeriodDays!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany('PenalizationRule', (rule: PenalizationRule) => rule.version)
  rules?: PenalizationRule[];

  @CreateDateColumn()
  createdAt!: Date;
}
