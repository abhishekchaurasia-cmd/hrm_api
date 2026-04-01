import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, type FindOptionsWhere, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import {
  Attendance,
  AttendanceStatus,
} from '../attendance/entities/attendance.entity.js';
import type { Shift } from '../shifts/entities/shift.entity.js';
import { ShiftAssignmentsService } from '../shifts/shift-assignments.service.js';

import type { QueryPenalizationRecordsDto } from './dto/query-penalization-records.dto.js';
import { PenalizationPolicyAssignment } from './entities/penalization-policy-assignment.entity.js';
import { PenalizationPolicyVersion } from './entities/penalization-policy-version.entity.js';
import {
  PenalizationRecord,
  PenalizationRecordStatus,
} from './entities/penalization-record.entity.js';
import {
  PenalizationRule,
  PenaltyType,
} from './entities/penalization-rule.entity.js';

@Injectable()
export class PenalizationRecordsService {
  constructor(
    @InjectRepository(PenalizationRecord)
    private readonly recordRepository: Repository<PenalizationRecord>,
    @InjectRepository(PenalizationPolicyAssignment)
    private readonly assignmentRepository: Repository<PenalizationPolicyAssignment>,
    @InjectRepository(PenalizationPolicyVersion)
    private readonly versionRepository: Repository<PenalizationPolicyVersion>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly shiftAssignmentsService: ShiftAssignmentsService
  ) {}

  async findAll(query: QueryPenalizationRecordsDto): Promise<
    ApiResponse<{
      records: PenalizationRecord[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<PenalizationRecord> = {};

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.penaltyType) {
      where.penaltyType = query.penaltyType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.startDate && query.endDate) {
      where.incidentDate = Between(query.startDate, query.endDate);
    }

    const [records, total] = await this.recordRepository.findAndCount({
      where,
      relations: ['user', 'policyVersion', 'rule'],
      order: { incidentDate: 'DESC' },
      skip,
      take: limit,
    });

    return {
      success: true,
      message: 'Penalization records retrieved',
      data: {
        records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async waive(
    recordId: string,
    remarks?: string
  ): Promise<ApiResponse<PenalizationRecord>> {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException(
        `Penalization record with ID "${recordId}" not found`
      );
    }

    record.status = PenalizationRecordStatus.WAIVED;
    if (remarks) {
      record.remarks = remarks;
    }
    const saved = await this.recordRepository.save(record);

    return {
      success: true,
      message: 'Penalty waived',
      data: saved,
    };
  }

  async evaluateAndCreatePenalties(
    userId: string,
    date: string
  ): Promise<ApiResponse<PenalizationRecord[]>> {
    const assignment = await this.assignmentRepository.findOne({
      where: { userId, isActive: true },
      relations: ['policy'],
      order: { assignedAt: 'DESC' },
    });

    if (!assignment || !assignment.policy.isActive) {
      return {
        success: true,
        message: 'No active penalization policy for user',
        data: [],
      };
    }

    const version = await this.versionRepository.findOne({
      where: { policyId: assignment.policyId, isActive: true },
      relations: ['rules'],
      order: { versionNumber: 'DESC' },
    });

    if (!version || !version.rules) {
      return {
        success: true,
        message: 'No active policy version found',
        data: [],
      };
    }

    const attendance = await this.attendanceRepository.findOne({
      where: { userId, workDate: date },
    });

    const shiftAssignment =
      await this.shiftAssignmentsService.getActiveShiftForUser(userId, date);
    const shift = shiftAssignment?.shift ?? null;

    const created: PenalizationRecord[] = [];

    for (const rule of version.rules) {
      if (!rule.isEnabled) {
        continue;
      }

      const penalty = this.evaluateRule(rule, attendance, shift, date);
      if (!penalty) {
        continue;
      }

      const existingRecord = await this.recordRepository.findOne({
        where: {
          userId,
          ruleId: rule.id,
          incidentDate: date,
        },
      });
      if (existingRecord) {
        continue;
      }

      const bufferDays = version.bufferPeriodDays;
      const penaltyDate = this.addDays(date, bufferDays);

      const record = this.recordRepository.create({
        userId,
        policyVersionId: version.id,
        ruleId: rule.id,
        incidentDate: date,
        penaltyDate,
        penaltyType: rule.penaltyType,
        deductionDays: penalty.deductionDays,
        deductionMethod: version.deductionMethod,
        status: PenalizationRecordStatus.PENDING,
        attendanceId: attendance?.id ?? null,
      });

      const saved = await this.recordRepository.save(record);
      created.push(saved);
    }

    return {
      success: true,
      message: `${created.length} penalty record(s) created`,
      data: created,
    };
  }

  private evaluateRule(
    rule: PenalizationRule,
    attendance: Attendance | null,
    shift: Shift | null,
    _date: string
  ): { deductionDays: number } | null {
    switch (rule.penaltyType) {
      case PenaltyType.NO_ATTENDANCE:
        return this.evaluateNoAttendance(rule, attendance);

      case PenaltyType.LATE_ARRIVAL:
        return this.evaluateLateArrival(rule, attendance);

      case PenaltyType.WORK_HOURS_SHORTAGE:
        return this.evaluateWorkHoursShortage(rule, attendance, shift);

      case PenaltyType.MISSING_SWIPES:
        return this.evaluateMissingSwipes(rule, attendance);

      default:
        return null;
    }
  }

  private evaluateNoAttendance(
    rule: PenalizationRule,
    attendance: Attendance | null
  ): { deductionDays: number } | null {
    if (!attendance || attendance.status === AttendanceStatus.ABSENT) {
      return { deductionDays: Number(rule.deductionPerIncident) };
    }
    return null;
  }

  private evaluateLateArrival(
    rule: PenalizationRule,
    attendance: Attendance | null
  ): { deductionDays: number } | null {
    if (attendance?.status === AttendanceStatus.LATE) {
      return { deductionDays: Number(rule.deductionPerIncident) };
    }
    return null;
  }

  private evaluateWorkHoursShortage(
    rule: PenalizationRule,
    attendance: Attendance | null,
    shift: Shift | null
  ): { deductionDays: number } | null {
    if (!attendance || attendance.totalMinutes === null) {
      return null;
    }

    const requiredMinutes = shift ? Number(shift.workHoursPerDay) * 60 : 9 * 60;
    const actualPercentage = (attendance.totalMinutes / requiredMinutes) * 100;

    const threshold = rule.effectiveHoursPercentage
      ? Number(rule.effectiveHoursPercentage)
      : 90;

    if (actualPercentage < threshold) {
      return { deductionDays: Number(rule.deductionPerIncident) };
    }
    return null;
  }

  private evaluateMissingSwipes(
    rule: PenalizationRule,
    attendance: Attendance | null
  ): { deductionDays: number } | null {
    if (!attendance) {
      return null;
    }

    if (attendance.punchInAt && !attendance.punchOutAt) {
      return { deductionDays: Number(rule.deductionPerIncident) };
    }
    return null;
  }

  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
