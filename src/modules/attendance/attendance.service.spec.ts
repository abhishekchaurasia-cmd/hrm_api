import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Holiday } from '../holidays/entities/holiday.entity.js';
import { Leave } from '../leaves/entities/leave.entity.js';
import { PenalizationRecord } from '../penalization-policies/entities/penalization-record.entity.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { ShiftAssignmentsService } from '../shifts/shift-assignments.service.js';
import { TimeTrackingPoliciesService } from '../time-tracking-policies/time-tracking-policies.service.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';

import { AttendanceService } from './attendance.service.js';
import { Attendance, AttendanceStatus } from './entities/attendance.entity.js';

describe('AttendanceService', () => {
  let service: AttendanceService;

  const mockAttendanceRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockProfileRepo = {
    findOne: jest.fn(),
  };

  const mockWeeklyOffRepo = {
    findOne: jest.fn(),
  };

  const mockHolidayRepo = {
    find: jest.fn(),
  };

  const mockLeaveRepo = {
    find: jest.fn(),
  };

  const mockPenalizationRecordRepo = {
    find: jest.fn(),
  };

  const mockShiftAssignmentsService = {
    getActiveShiftForUser: jest.fn(),
  };

  const mockTimeTrackingPoliciesService = {
    getActivePolicyForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
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
          provide: getRepositoryToken(ShiftWeeklyOff),
          useValue: mockWeeklyOffRepo,
        },
        { provide: getRepositoryToken(Holiday), useValue: mockHolidayRepo },
        { provide: getRepositoryToken(Leave), useValue: mockLeaveRepo },
        {
          provide: getRepositoryToken(PenalizationRecord),
          useValue: mockPenalizationRecordRepo,
        },
        {
          provide: ShiftAssignmentsService,
          useValue: mockShiftAssignmentsService,
        },
        {
          provide: TimeTrackingPoliciesService,
          useValue: mockTimeTrackingPoliciesService,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('punchIn', () => {
    const authUser = {
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
    };

    it('should throw if already punched in', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue({
        punchInAt: new Date(),
        punchOutAt: null,
      });

      await expect(service.punchIn(authUser)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw if already completed attendance for today', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue({
        punchInAt: new Date(),
        punchOutAt: new Date(),
      });

      await expect(service.punchIn(authUser)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should punch in successfully without shift', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockTimeTrackingPoliciesService.getActivePolicyForUser.mockResolvedValue(
        null
      );
      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue(null);
      mockAttendanceRepo.create.mockReturnValue({
        userId: 'user-1',
        punchInAt: null,
        punchOutAt: null,
        status: AttendanceStatus.PRESENT,
        isAutoLogout: false,
      });
      mockAttendanceRepo.save.mockImplementation((record: Attendance) =>
        Promise.resolve({
          ...record,
          id: 'att-1',
          punchInAt: new Date(),
          isAutoLogout: false,
        })
      );

      const result = await service.punchIn(authUser);

      expect(result.success).toBe(true);
      expect(result.data.isAutoLogout).toBe(false);
    });

    it('should compute lateByMinutes when shift exists and user is late', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockTimeTrackingPoliciesService.getActivePolicyForUser.mockResolvedValue(
        null
      );

      const mockShift = {
        id: 'shift-1',
        startTime: '09:00',
        endTime: '18:00',
        graceMinutes: 10,
        workHoursPerDay: 9,
        breakDurationMinutes: 60,
      };
      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue({
        shift: mockShift,
      });

      const createdRecord = {
        userId: 'user-1',
        shiftId: 'shift-1',
        punchInAt: null,
        punchOutAt: null,
        totalMinutes: null,
        effectiveMinutes: null,
        overtimeMinutes: null,
        lateByMinutes: null,
        earlyLeaveMinutes: null,
        status: AttendanceStatus.PRESENT,
        isAutoLogout: false,
      };

      mockAttendanceRepo.create.mockReturnValue(createdRecord);
      mockAttendanceRepo.save.mockImplementation((record: Attendance) =>
        Promise.resolve({ ...record, id: 'att-1' })
      );

      const result = await service.punchIn(authUser);
      expect(result.success).toBe(true);
    });
  });

  describe('punchOut', () => {
    const authUser = {
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
    };

    it('should throw if not punched in', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      await expect(service.punchOut(authUser)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw if already punched out', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue({
        punchInAt: new Date(),
        punchOutAt: new Date(),
      });
      await expect(service.punchOut(authUser)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should punch out and compute effective/overtime minutes', async () => {
      const punchInTime = new Date();
      punchInTime.setHours(punchInTime.getHours() - 10);

      mockAttendanceRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        punchInAt: punchInTime,
        punchOutAt: null,
        shiftId: 'shift-1',
        status: AttendanceStatus.PRESENT,
      });

      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue({
        shift: {
          workHoursPerDay: 9,
          breakDurationMinutes: 60,
          endTime: '18:00',
        },
      });

      mockAttendanceRepo.save.mockImplementation((record: Attendance) =>
        Promise.resolve({ ...record })
      );

      const result = await service.punchOut(authUser);

      expect(result.success).toBe(true);
      expect(result.data.totalMinutes).toBeGreaterThan(0);
      expect(result.data.effectiveMinutes).toBeDefined();
    });
  });

  describe('getDetailedReport', () => {
    it('should throw if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getDetailedReport('nonexistent', 3, 2026)
      ).rejects.toThrow(BadRequestException);
    });

    it('should return a detailed report for valid user', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        department: { name: 'Engineering' },
      });
      mockProfileRepo.findOne.mockResolvedValue({
        employeeNumber: 'EMP-001',
        holidayListId: null,
      });
      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue({
        shift: {
          name: 'General',
          weeklyOffs: [{ dayOfWeek: 0 }, { dayOfWeek: 6 }],
          workHoursPerDay: 9,
          breakDurationMinutes: 60,
          startTime: '09:00',
          endTime: '18:00',
        },
      });
      mockLeaveRepo.find.mockResolvedValue([]);
      mockAttendanceRepo.find.mockResolvedValue([]);
      mockPenalizationRecordRepo.find.mockResolvedValue([]);

      const result = await service.getDetailedReport('user-1', 3, 2026);

      expect(result.success).toBe(true);
      expect(result.data.employee.name).toBe('John Doe');
      expect(result.data.period.month).toBe(3);
      expect(result.data.period.year).toBe(2026);
      expect(result.data.dailyDetails).toHaveLength(31);
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.weeklyOffDays).toBeGreaterThan(0);
    });

    it('should correctly classify working days, holidays, and leaves', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Smith',
        department: null,
      });
      mockProfileRepo.findOne.mockResolvedValue({
        employeeNumber: 'EMP-002',
        holidayListId: 'hl-1',
      });
      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue({
        shift: {
          name: 'Day Shift',
          weeklyOffs: [{ dayOfWeek: 0 }],
          workHoursPerDay: 8,
          breakDurationMinutes: 30,
          startTime: '09:00',
          endTime: '17:30',
        },
      });
      mockHolidayRepo.find.mockResolvedValue([{ date: '2026-03-26' }]);
      mockLeaveRepo.find.mockResolvedValue([
        {
          startDate: '2026-03-10',
          endDate: '2026-03-10',
          leaveType: 'sick',
          isHalfDay: false,
          status: 'approved',
        },
      ]);
      mockAttendanceRepo.find.mockResolvedValue([
        {
          workDate: '2026-03-02',
          punchInAt: new Date('2026-03-02T09:00:00'),
          punchOutAt: new Date('2026-03-02T18:00:00'),
          totalMinutes: 540,
          effectiveMinutes: 510,
          overtimeMinutes: 30,
          lateByMinutes: 0,
          earlyLeaveMinutes: 0,
          isAutoLogout: false,
          status: AttendanceStatus.PRESENT,
          shift: { name: 'Day Shift' },
        },
      ]);
      mockPenalizationRecordRepo.find.mockResolvedValue([]);

      const result = await service.getDetailedReport('user-1', 3, 2026);

      expect(result.success).toBe(true);
      const holidayDay = result.data.dailyDetails.find(
        d => d.date === '2026-03-26'
      );
      expect(holidayDay?.dayType).toBe('holiday');

      const leaveDay = result.data.dailyDetails.find(
        d => d.date === '2026-03-10'
      );
      expect(leaveDay?.dayType).toBe('leave');

      const workDay = result.data.dailyDetails.find(
        d => d.date === '2026-03-02'
      );
      expect(workDay?.dayType).toBe('working');
      expect(workDay?.totalHours).toBe(9);

      expect(result.data.summary.holidayDays).toBe(1);
      expect(result.data.summary.presentDays).toBe(1);
    });
  });

  describe('getMyAttendanceSummary', () => {
    const authUser = {
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
    };

    it('should return monthly summary', async () => {
      mockAttendanceRepo.find.mockResolvedValue([
        { status: AttendanceStatus.PRESENT, totalMinutes: 540 },
        { status: AttendanceStatus.LATE, totalMinutes: 500 },
        { status: AttendanceStatus.HALF_DAY, totalMinutes: 240 },
      ]);
      mockShiftAssignmentsService.getActiveShiftForUser.mockResolvedValue({
        shift: { workHoursPerDay: 9 },
      });

      const result = await service.getMyAttendanceSummary(authUser, 3, 2026);

      expect(result.success).toBe(true);
      expect(result.data.present).toBe(1);
      expect(result.data.late).toBe(1);
      expect(result.data.halfDay).toBe(1);
      expect(result.data.totalWorkedMinutes).toBe(1280);
    });
  });
});
