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

import type { User } from '../../users/entities/user.entity.js';
import type { LeaveTransaction } from './leave-transaction.entity.js';
import type { LeaveTypeConfig } from './leave-type-config.entity.js';

@Entity('leave_balances')
@Unique('UQ_leave_balance_user_type_year', [
  'userId',
  'leaveTypeConfigId',
  'year',
])
export class LeaveBalance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  leaveTypeConfigId!: string;

  @ManyToOne('LeaveTypeConfig', (config: LeaveTypeConfig) => config.balances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leaveTypeConfigId' })
  leaveTypeConfig!: LeaveTypeConfig;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  allocated!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  used!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  carriedForward!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  adjusted!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  balance!: number;

  @OneToMany(
    'LeaveTransaction',
    (transaction: LeaveTransaction) => transaction.leaveBalance
  )
  transactions?: LeaveTransaction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
