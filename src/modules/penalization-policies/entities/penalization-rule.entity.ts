import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { PenalizationPolicyVersion } from './penalization-policy-version.entity.js';

export enum PenaltyType {
  NO_ATTENDANCE = 'no_attendance',
  LATE_ARRIVAL = 'late_arrival',
  WORK_HOURS_SHORTAGE = 'work_hours_shortage',
  MISSING_SWIPES = 'missing_swipes',
}

export enum ThresholdType {
  INSTANCE_BASED = 'instance_based',
  PERCENTAGE_BASED = 'percentage_based',
}

@Entity('penalization_rules')
export class PenalizationRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  versionId!: string;

  @ManyToOne(
    'PenalizationPolicyVersion',
    (version: PenalizationPolicyVersion) => version.rules,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'versionId' })
  version!: PenalizationPolicyVersion;

  @Column({ type: 'enum', enum: PenaltyType })
  penaltyType!: PenaltyType;

  @Column({ type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  deductionPerIncident!: number;

  @Column({
    type: 'enum',
    enum: ThresholdType,
    nullable: true,
  })
  thresholdType!: ThresholdType | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  thresholdValue!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  thresholdUnit!: string | null;

  @Column({ type: 'int', nullable: true })
  minInstancesBeforePenalty!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  effectiveHoursPercentage!: number | null;
}
