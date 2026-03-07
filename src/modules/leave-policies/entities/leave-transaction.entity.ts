import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { Leave } from '../../leaves/entities/leave.entity.js';
import type { User } from '../../users/entities/user.entity.js';
import type { LeaveBalance } from './leave-balance.entity.js';

export enum LeaveTransactionType {
  ALLOCATION = 'allocation',
  DEDUCTION = 'deduction',
  CARRY_FORWARD = 'carry_forward',
  ENCASHMENT = 'encashment',
  REVERSAL = 'reversal',
  ADJUSTMENT = 'adjustment',
}

@Entity('leave_transactions')
export class LeaveTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  leaveBalanceId!: string;

  @ManyToOne('LeaveBalance', (balance: LeaveBalance) => balance.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leaveBalanceId' })
  leaveBalance!: LeaveBalance;

  @Column({ type: 'uuid', nullable: true })
  leaveId!: string | null;

  @ManyToOne('Leave', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'leaveId' })
  leave?: Leave;

  @Column({
    type: 'enum',
    enum: LeaveTransactionType,
  })
  transactionType!: LeaveTransactionType;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  days!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  previousBalance!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  newBalance!: number;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Column({ type: 'uuid' })
  performedBy!: string;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'performedBy' })
  performedByUser?: User;

  @CreateDateColumn()
  createdAt!: Date;
}
