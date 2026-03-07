import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Attendance } from '../../attendance/entities/attendance.entity.js';
import type { Department } from '../../departments/entities/department.entity.js';
import type { Leave } from '../../leaves/entities/leave.entity.js';
import type { EmployeeProfile } from './employee-profile.entity.js';

export enum UserRole {
  EMPLOYEE = 'employee',
  HR = 'hr',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  firstName!: string;

  @Column({ type: 'varchar', length: 255 })
  lastName!: string;

  @Column({ name: 'password', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid', nullable: true })
  departmentId!: string | null;

  @ManyToOne('Department', (department: Department) => department.users, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'departmentId' })
  department?: Department;

  @OneToMany('Attendance', (attendance: Attendance) => attendance.user)
  attendanceRecords?: Attendance[];

  @OneToMany('Leave', (leave: Leave) => leave.user)
  leaveRequests?: Leave[];

  @OneToOne('EmployeeProfile', (profile: EmployeeProfile) => profile.user)
  profile?: EmployeeProfile;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
