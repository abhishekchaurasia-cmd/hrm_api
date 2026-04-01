import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  Attendance,
  AttendanceStatus,
} from '../attendance/entities/attendance.entity.js';
import { Holiday } from '../holidays/entities/holiday.entity.js';
import { Leave, LeaveStatus } from '../leaves/entities/leave.entity.js';
import { PenalizationPolicyAssignment } from '../penalization-policies/entities/penalization-policy-assignment.entity.js';
import { PenalizationRecordsService } from '../penalization-policies/penalization-records.service.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';

import { AttendanceAutomationService } from './attendance-automation.service.js';

describe('AttendanceAutomationService', () => {
  let service: AttendanceAutomationService;

  const mockAttendanceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepo = {
    find: jest.fn(),
  };

  const mockProfileRepo = {
    findOne: jest.fn(),
  };

  const mockShiftAssignmentRepo = {
    findOne: jest.fn(),
  };

  const mockWeeklyOffRepo = {
    findOne: jest.fn(),
  };

  const mockHolidayRepo = {
    findOne: jest.fn(),
  };

  const mockLeaveRepo = {
    findOne: jest.fn(),
  };

  const mockPenalizationAssignmentRepo = {
    find: jest.fn(),
  };

  const mockPenalizationRecordsService = {
    evaluateAndCreatePenalties: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceAutomationService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: mockAttendanceRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(EmployeeProfile),
          useValue: mockProfileRepo,
        },
        {
          provide: getRepositoryToken(ShiftAssignment),
          useValue: mockShiftAssignmentRepo,
        },
        {
          provide: getRepositoryToken(ShiftWeeklyOff),
          useValue: mockWeeklyOffRepo,
        },
        { provide: getRepositoryToken(Holiday), useValue: mockHolidayRepo },
        { provide: getRepositoryToken(Leave), useValue: mockLeaveRepo },
        {
          provide: getRepositoryToken(PenalizationPolicyAssignment),
          useValue: mockPenalizationAssignmentRepo,
        },
        {
          provide: PenalizationRecordsService,
          useValue: mockPenalizationRecordsService,
        },
      ],
    }).compile();

    service = module.get<AttendanceAutomationService>(
      AttendanceAutomationService
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleAutoPunchOut', () => {
    it('should return 0 when no open records exist', async () => {
      mockAttendanceRepo.find.mockResolvedValue([]);
      const result = await service.handleAutoPunchOut();
      expect(result).toBe(0);
    });

    it('should auto punch-out employees with open attendance', async () => {
      const punchInTime = new Date();
      punchInTime.setHours(9, 0, 0, 0);

      const openRecord = {
        id: 'att-1',
        userId: 'user-1',
        workDate: '2026-03-19',
        punchInAt: punchInTime,
        punchOutAt: null,
        shiftId: null,
        status: AttendanceStatus.PRESENT,
        totalMinutes: null,
        effectiveMinutes: null,
        overtimeMinutes: null,
        earlyLeaveMinutes: null,
        isAutoLogout: false,
        autoLogoutReason: null,
      };

      mockAttendanceRepo.find.mockResolvedValue([openRecord]);
      mockShiftAssignmentRepo.findOne.mockResolvedValue(null);
      mockAttendanceRepo.save.mockResolvedValue({
        ...openRecord,
        punchOutAt: new Date(),
      });

      const result = await service.handleAutoPunchOut();

      expect(result).toBe(1);
      expect(mockAttendanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isAutoLogout: true,
          autoLogoutReason: 'midnight_cutoff',
        })
      );
    });

    it('should calculate totalMinutes and set status on auto punch-out', async () => {
      const punchInTime = new Date();
      punchInTime.setHours(9, 0, 0, 0);

      const openRecord = {
        id: 'att-1',
        userId: 'user-1',
        workDate: '2026-03-19',
        punchInAt: punchInTime,
        punchOutAt: null,
        shiftId: 'shift-1',
        status: AttendanceStatus.LATE,
        totalMinutes: null,
        effectiveMinutes: null,
        overtimeMinutes: null,
        earlyLeaveMinutes: null,
        isAutoLogout: false,
        autoLogoutReason: null,
      };

      mockAttendanceRepo.find.mockResolvedValue([openRecord]);
      mockShiftAssignmentRepo.findOne.mockResolvedValue({
        shift: {
          workHoursPerDay: 9,
          breakDurationMinutes: 60,
        },
      });
      mockAttendanceRepo.save.mockImplementation((record: Attendance) =>
        Promise.resolve(record)
      );

      const result = await service.handleAutoPunchOut();

      expect(result).toBe(1);
      expect(mockAttendanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isAutoLogout: true,
          autoLogoutReason: 'midnight_cutoff',
        })
      );
      const saveCalls = mockAttendanceRepo.save.mock.calls as Array<
        [{ totalMinutes: number; punchOutAt: Date | null }]
      >;
      const savedRecord = saveCalls[0][0];
      expect(savedRecord.totalMinutes).toBeGreaterThan(0);
      expect(savedRecord.punchOutAt).toBeDefined();
    });
  });

  describe('handleMarkAbsent', () => {
    it('should mark absent for employees without attendance on a working day', async () => {
      mockUserRepo.find.mockResolvedValue([{ id: 'user-1' }]);
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockShiftAssignmentRepo.findOne.mockResolvedValue(null);
      mockWeeklyOffRepo.findOne.mockResolvedValue(null);
      mockProfileRepo.findOne.mockResolvedValue(null);
      mockLeaveRepo.findOne.mockResolvedValue(null);
      mockAttendanceRepo.create.mockReturnValue({
        userId: 'user-1',
        status: AttendanceStatus.ABSENT,
      });
      mockAttendanceRepo.save.mockResolvedValue({ id: 'new-att' });

      const result = await service.handleMarkAbsent();

      expect(result).toBe(1);
      expect(mockAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          status: AttendanceStatus.ABSENT,
        })
      );
    });

    it('should not mark absent if attendance already exists', async () => {
      mockUserRepo.find.mockResolvedValue([{ id: 'user-1' }]);
      mockAttendanceRepo.findOne.mockResolvedValue({ id: 'existing' });

      const result = await service.handleMarkAbsent();

      expect(result).toBe(0);
      expect(mockAttendanceRepo.create).not.toHaveBeenCalled();
    });

    it('should not mark absent on weekly off', async () => {
      mockUserRepo.find.mockResolvedValue([{ id: 'user-1' }]);
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockShiftAssignmentRepo.findOne.mockResolvedValue({
        shiftId: 'shift-1',
      });
      mockWeeklyOffRepo.findOne.mockResolvedValue({ id: 'wo-1', dayOfWeek: 0 });

      const result = await service.handleMarkAbsent();

      expect(result).toBe(0);
    });

    it('should not mark absent on holiday', async () => {
      mockUserRepo.find.mockResolvedValue([{ id: 'user-1' }]);
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockShiftAssignmentRepo.findOne.mockResolvedValue(null);
      mockWeeklyOffRepo.findOne.mockResolvedValue(null);
      mockProfileRepo.findOne.mockResolvedValue({ holidayListId: 'hl-1' });
      mockHolidayRepo.findOne.mockResolvedValue({
        id: 'h-1',
        date: '2026-03-18',
      });

      const result = await service.handleMarkAbsent();

      expect(result).toBe(0);
    });

    it('should not mark absent if on approved leave', async () => {
      mockUserRepo.find.mockResolvedValue([{ id: 'user-1' }]);
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockShiftAssignmentRepo.findOne.mockResolvedValue(null);
      mockWeeklyOffRepo.findOne.mockResolvedValue(null);
      mockProfileRepo.findOne.mockResolvedValue(null);
      mockLeaveRepo.findOne.mockResolvedValue({
        status: LeaveStatus.APPROVED,
        startDate: '2026-03-15',
        endDate: '2026-03-20',
      });

      const result = await service.handleMarkAbsent();

      expect(result).toBe(0);
    });
  });

  describe('handleEvaluatePenalties', () => {
    it('should evaluate penalties for all employees with assignments', async () => {
      mockPenalizationAssignmentRepo.find.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      mockPenalizationRecordsService.evaluateAndCreatePenalties.mockResolvedValue(
        {
          data: [{ id: 'pen-1' }],
        }
      );

      const result = await service.handleEvaluatePenalties();

      expect(result).toBe(2);
      expect(
        mockPenalizationRecordsService.evaluateAndCreatePenalties
      ).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no assignments exist', async () => {
      mockPenalizationAssignmentRepo.find.mockResolvedValue([]);

      const result = await service.handleEvaluatePenalties();

      expect(result).toBe(0);
    });
  });
});
