import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import type { LeaveBalance } from './leave-balance.entity.js';
import type { LeavePlan } from './leave-plan.entity.js';

export enum YearEndAction {
  RESET_TO_ZERO = 'reset_to_zero',
  CARRY_FORWARD_ALL = 'carry_forward_all',
  CARRY_FORWARD_LIMITED = 'carry_forward_limited',
  NONE = 'none',
}

@Entity('leave_type_configs')
@Unique('UQ_leave_type_config_plan_code', ['leavePlanId', 'code'])
export class LeaveTypeConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  leavePlanId!: string;

  @ManyToOne('LeavePlan', (plan: LeavePlan) => plan.leaveTypeConfigs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leavePlanId' })
  leavePlan!: LeavePlan;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  quota!: number;

  @Column({ type: 'boolean', default: false })
  isUnlimited!: boolean;

  @Column({ type: 'boolean', default: true })
  isPaid!: boolean;

  @Column({
    type: 'enum',
    enum: YearEndAction,
    default: YearEndAction.RESET_TO_ZERO,
  })
  yearEndAction!: YearEndAction;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  maxCarryForward!: number | null;

  @Column({ type: 'int', nullable: true })
  carryForwardExpiryDays!: number | null;

  @Column({ type: 'boolean', default: false })
  isEncashable!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany('LeaveBalance', (balance: LeaveBalance) => balance.leaveTypeConfig)
  balances?: LeaveBalance[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
