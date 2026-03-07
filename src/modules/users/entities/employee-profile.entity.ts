import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { BusinessUnit } from '../../organization/entities/business-unit.entity.js';
import type { LegalEntity } from '../../organization/entities/legal-entity.entity.js';
import type { Location } from '../../organization/entities/location.entity.js';
import type { HolidayList } from '../../holidays/entities/holiday-list.entity.js';
import type { User } from './user.entity.js';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum TimeType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
}

export enum WorkerType {
  PERMANENT = 'permanent',
  CONTRACT = 'contract',
  INTERN = 'intern',
  CONSULTANT = 'consultant',
}

@Entity('employee_profiles')
export class EmployeeProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(
    'User',
    (user: User & { profile?: EmployeeProfile }) => user.profile
  )
  @JoinColumn({ name: 'userId' })
  user?: User;

  // --- Basic Details (Tab 1) ---

  @Column({ type: 'varchar', length: 255, nullable: true })
  middleName!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName!: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender!: Gender | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nationality!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workCountry!: string | null;

  @Column({ type: 'varchar', length: 50, unique: true })
  employeeNumber!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  numberSeries!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobileNumber!: string | null;

  // --- Job Details (Tab 2) ---

  @Column({ type: 'date', nullable: true })
  joiningDate!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jobTitle!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  secondaryJobTitle!: string | null;

  @Column({
    type: 'enum',
    enum: TimeType,
    default: TimeType.FULL_TIME,
  })
  timeType!: TimeType;

  @Column({ type: 'enum', enum: WorkerType, nullable: true })
  workerType!: WorkerType | null;

  @Column({ type: 'uuid', nullable: true })
  reportingManagerId!: string | null;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reportingManagerId' })
  reportingManager?: User;

  @Column({ type: 'uuid', nullable: true })
  dottedLineManagerId!: string | null;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dottedLineManagerId' })
  dottedLineManager?: User;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId!: string | null;

  @ManyToOne('LegalEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntity;

  @Column({ type: 'uuid', nullable: true })
  businessUnitId!: string | null;

  @ManyToOne('BusinessUnit', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessUnitId' })
  businessUnit?: BusinessUnit;

  @Column({ type: 'uuid', nullable: true })
  locationId!: string | null;

  @ManyToOne('Location', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'locationId' })
  location?: Location;

  @Column({ type: 'int', nullable: true })
  probationPolicyMonths!: number | null;

  @Column({ type: 'int', nullable: true })
  noticePeriodDays!: number | null;

  // --- More Details (Tab 3) ---

  @Column({ type: 'boolean', default: false })
  inviteToLogin!: boolean;

  @Column({ type: 'boolean', default: false })
  enableOnboardingFlow!: boolean;

  @Column({ type: 'uuid', nullable: true })
  holidayListId!: string | null;

  @ManyToOne('HolidayList', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'holidayListId' })
  holidayList?: HolidayList;

  @Column({ type: 'varchar', length: 50, nullable: true })
  attendanceNumber!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
