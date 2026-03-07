import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ComponentType {
  EARNING = 'earning',
  DEDUCTION = 'deduction',
}

export enum CalculationType {
  FIXED = 'fixed',
  PERCENTAGE_OF_BASIC = 'percentage_of_basic',
  PERCENTAGE_OF_GROSS = 'percentage_of_gross',
}

@Entity('salary_components')
export class SalaryComponent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'enum', enum: ComponentType })
  componentType!: ComponentType;

  @Column({ type: 'enum', enum: CalculationType })
  calculationType!: CalculationType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  defaultPercentage!: number | null;

  @Column({ type: 'boolean', default: false })
  isMandatory!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
