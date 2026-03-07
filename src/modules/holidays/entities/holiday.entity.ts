import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import type { HolidayList } from './holiday-list.entity.js';

@Entity('holidays')
@Unique(['holidayListId', 'date'])
export class Holiday {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  holidayListId!: string;

  @ManyToOne('HolidayList', (hl: HolidayList) => hl.holidays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'holidayListId' })
  holidayList?: HolidayList;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'boolean', default: false })
  isOptional!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
