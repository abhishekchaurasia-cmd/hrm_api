import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  Attendance,
  AttendanceStatus,
} from '../attendance/entities/attendance.entity.js';
import { ShiftAssignmentsService } from '../shifts/shift-assignments.service.js';

import { PenalizationPolicyAssignment } from './entities/penalization-policy-assignment.entity.js';
import {
  PenalizationPolicyVersion,
  DeductionMethod,
} from './entities/penalization-policy-version.entity.js';
import {
  PenalizationRecord,
  PenalizationRecordStatus,
} from './entities/penalization-record.entity.js';
import {
  PenalizationRule,
  PenaltyType,
} from './entities/penalization-rule.entity.js';
import { PenalizationRecordsService } from './penalization-records.service.js';

describe('PenalizationRecordsService', () => {
  let service: PenalizationRecordsService;

  const mockRecordRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAssignmentRepo = {
    findOne: jest.fn(),
  };

  const mockVersionRepo = {
    findOne: jest.fn(),
  };

  const mockAttendanceRepo = {
    findOne: jest.fn(),
  };

  const mockShiftAssignmentsService = {
    getActiveShiftForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PenalizationRecordsService,
        {
          provide: getRepositoryToken(PenalizationRecord),
          useValue: mockRecordRepo,
        },
        {
          provide: getRepositoryToken(PenalizationPolicyAssignment),
          useValue: mockAssignmentRepo,
        },
        {
          provide: getRepositoryToken(PenalizationPolicyVersion),
          useValue: mockVersionRepo,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: mockAttendanceRepo,
        },
        {
          provide: ShiftAssignmentsService,
          useValue: mockShiftAssignmentsService,
        },
      ],
    }).compile();

    service = module.get<PenalizationRecordsService>(
      PenalizationRecordsService
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('waive', () => {
    it('should throw NotFoundException if record not found', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);

      await expect(service.waive('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should waive a penalty record', async () => {
      const record = {
        id: 'pen-1',
        status: PenalizationRecordStatus.PENDING,
        remarks: null,
      };
      mockRecordRepo.findOne.mockResolvedValue(record);
      mockRecordRepo.save.mockResolvedValue({
        ...record,
        status: PenalizationRecordStatus.WAIVED,
        remarks: 'Excused',
      });

      const result = await service.waive('pen-1', 'Excused');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(PenalizationRecordStatus.WAIVED);
    });
  });

  describe('evaluateAndCreatePenalties', () => {
    it('should return empty when no policy assignment exists', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(null);

      const result = await service.evaluateAndCreatePenalties(
        'user-1',
        '2026-03-19'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should create penalty for late arrival', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        policyId: 'pol-1',
        policy: { isActive: true },
      });

      const lateRule: Partial<PenalizationRule> = {
        id: 'rule-1',
        penaltyType: PenaltyType.LATE_ARRIVAL,
        isEnabled: true,
        deductionPerIncident: 0.5,
      };

      mockVersionRepo.findOne.mockResolvedValue({
        id: 'ver-1',
        policyId: 'pol-1',
        isActive: true,
        bufferPeriodDays: 0,
        deductionMethod: DeductionMethod.LOSS_OF_PAY,
        rules: [lateRule],
      });

      mockAttendanceRepo.findOne.mockResolvedValue({
        id: 'att-1',
        status: AttendanceStatus.LATE,
        totalMinutes: 480,
        punchInAt: new Date(),
        punchOutAt: new Date(),
      });

      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue({
        shift: { workHoursPerDay: 9 },
      });

      mockRecordRepo.findOne.mockResolvedValue(null);
      mockRecordRepo.create.mockReturnValue({
        userId: 'user-1',
        ruleId: 'rule-1',
        penaltyType: PenaltyType.LATE_ARRIVAL,
        deductionDays: 0.5,
        status: PenalizationRecordStatus.PENDING,
      });
      mockRecordRepo.save.mockImplementation((r: PenalizationRecord) =>
        Promise.resolve({ ...r, id: 'pen-1' })
      );

      const result = await service.evaluateAndCreatePenalties(
        'user-1',
        '2026-03-19'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should create penalty for no attendance (absent)', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        policyId: 'pol-1',
        policy: { isActive: true },
      });

      const noAttendanceRule: Partial<PenalizationRule> = {
        id: 'rule-2',
        penaltyType: PenaltyType.NO_ATTENDANCE,
        isEnabled: true,
        deductionPerIncident: 1,
      };

      mockVersionRepo.findOne.mockResolvedValue({
        id: 'ver-1',
        isActive: true,
        bufferPeriodDays: 0,
        deductionMethod: DeductionMethod.LOSS_OF_PAY,
        rules: [noAttendanceRule],
      });

      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue(null);
      mockRecordRepo.findOne.mockResolvedValue(null);
      mockRecordRepo.create.mockReturnValue({
        userId: 'user-1',
        penaltyType: PenaltyType.NO_ATTENDANCE,
        deductionDays: 1,
        status: PenalizationRecordStatus.PENDING,
      });
      mockRecordRepo.save.mockImplementation((r: PenalizationRecord) =>
        Promise.resolve({ ...r, id: 'pen-2' })
      );

      const result = await service.evaluateAndCreatePenalties(
        'user-1',
        '2026-03-19'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should skip disabled rules', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        policyId: 'pol-1',
        policy: { isActive: true },
      });

      mockVersionRepo.findOne.mockResolvedValue({
        id: 'ver-1',
        isActive: true,
        bufferPeriodDays: 0,
        deductionMethod: DeductionMethod.LOSS_OF_PAY,
        rules: [
          {
            id: 'rule-1',
            penaltyType: PenaltyType.LATE_ARRIVAL,
            isEnabled: false,
            deductionPerIncident: 0.5,
          },
        ],
      });

      mockAttendanceRepo.findOne.mockResolvedValue({
        status: AttendanceStatus.LATE,
      });

      const result = await service.evaluateAndCreatePenalties(
        'user-1',
        '2026-03-19'
      );

      expect(result.data).toHaveLength(0);
    });

    it('should not duplicate penalties for same rule and date', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        policyId: 'pol-1',
        policy: { isActive: true },
      });

      mockVersionRepo.findOne.mockResolvedValue({
        id: 'ver-1',
        isActive: true,
        bufferPeriodDays: 0,
        deductionMethod: DeductionMethod.LOSS_OF_PAY,
        rules: [
          {
            id: 'rule-1',
            penaltyType: PenaltyType.LATE_ARRIVAL,
            isEnabled: true,
            deductionPerIncident: 0.5,
          },
        ],
      });

      mockAttendanceRepo.findOne.mockResolvedValue({
        id: 'att-1',
        status: AttendanceStatus.LATE,
      });
      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue(null);
      mockRecordRepo.findOne.mockResolvedValue({ id: 'existing-pen' });

      const result = await service.evaluateAndCreatePenalties(
        'user-1',
        '2026-03-19'
      );

      expect(result.data).toHaveLength(0);
      expect(mockRecordRepo.create).not.toHaveBeenCalled();
    });
  });
});
