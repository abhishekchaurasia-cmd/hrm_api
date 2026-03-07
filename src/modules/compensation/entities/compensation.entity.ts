import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { User } from '../../users/entities/user.entity.js';
import type { SalaryBreakup } from './salary-breakup.entity.js';

export enum TaxRegime {
  OLD_REGIME = 'old_regime',
  NEW_REGIME = 'new_regime',
}

@Entity('compensations')
export class Compensation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  annualSalary!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ type: 'date' })
  salaryEffectiveFrom!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  regularSalary!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  bonus!: number;

  @Column({ type: 'boolean', default: false })
  isEsiEligible!: boolean;

  @Column({
    type: 'enum',
    enum: TaxRegime,
    default: TaxRegime.NEW_REGIME,
  })
  taxRegime!: TaxRegime;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany('SalaryBreakup', (sb: SalaryBreakup) => sb.compensation)
  breakups?: SalaryBreakup[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
