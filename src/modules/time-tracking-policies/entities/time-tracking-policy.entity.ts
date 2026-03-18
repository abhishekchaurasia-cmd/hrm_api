import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { TimeTrackingPolicyAssignment } from './time-tracking-policy-assignment.entity.js';
import type {
  AdjustmentSettings,
  ApprovalSettings,
  CaptureSettings,
  PartialDaySettings,
  RegularizationSettings,
} from '../types/time-tracking-policy.types.js';
import {
  DEFAULT_ADJUSTMENT_SETTINGS,
  DEFAULT_APPROVAL_SETTINGS,
  DEFAULT_CAPTURE_SETTINGS,
  DEFAULT_PARTIAL_DAY_SETTINGS,
  DEFAULT_REGULARIZATION_SETTINGS,
} from '../types/time-tracking-policy.types.js';

@Entity('time_tracking_policies')
export class TimeTrackingPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: DEFAULT_CAPTURE_SETTINGS })
  captureSettings!: CaptureSettings;

  @Column({ type: 'boolean', default: false })
  wfhAllowed!: boolean;

  @Column({ type: 'boolean', default: false })
  wfhApprovalRequired!: boolean;

  @Column({ type: 'boolean', default: false })
  onDutyAllowed!: boolean;

  @Column({ type: 'jsonb', default: DEFAULT_PARTIAL_DAY_SETTINGS })
  partialDaySettings!: PartialDaySettings;

  @Column({ type: 'jsonb', default: DEFAULT_ADJUSTMENT_SETTINGS })
  adjustmentSettings!: AdjustmentSettings;

  @Column({ type: 'jsonb', default: DEFAULT_REGULARIZATION_SETTINGS })
  regularizationSettings!: RegularizationSettings;

  @Column({ type: 'jsonb', default: DEFAULT_APPROVAL_SETTINGS })
  approvalSettings!: ApprovalSettings;

  @OneToMany(
    'TimeTrackingPolicyAssignment',
    (assignment: TimeTrackingPolicyAssignment) => assignment.policy
  )
  assignments?: TimeTrackingPolicyAssignment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
