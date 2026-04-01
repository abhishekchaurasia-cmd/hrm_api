import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Attendance } from '../attendance/entities/attendance.entity.js';
import { Compensation } from '../compensation/entities/compensation.entity.js';
import { SalaryBreakup } from '../compensation/entities/salary-breakup.entity.js';
import { Holiday } from '../holidays/entities/holiday.entity.js';
import { Leave } from '../leaves/entities/leave.entity.js';
import { PenalizationRecord } from '../penalization-policies/entities/penalization-record.entity.js';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity.js';
import { ShiftWeeklyOff } from '../shifts/entities/shift-weekly-off.entity.js';
import { EmployeeProfile } from '../users/entities/employee-profile.entity.js';
import { User } from '../users/entities/user.entity.js';

import { PayrollDailyDetail } from './entities/payroll-daily-detail.entity.js';
import { PayrollReportDetail } from './entities/payroll-report-detail.entity.js';
import {
  PayrollReport,
  PayrollReportStatus,
} from './entities/payroll-report.entity.js';
import { PayrollReportsService } from './payroll-reports.service.js';

describe('PayrollReportsService', () => {
  let service: PayrollReportsService;

  const mockReportRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockDetailRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockDailyRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepo = {
    find: jest.fn(),
  };

  const mockProfileRepo = {
    findOne: jest.fn(),
  };

  const mockAttendanceRepo = {
    find: jest.fn(),
  };

  const mockShiftAssignmentRepo = {
    findOne: jest.fn(),
  };

  const mockWeeklyOffRepo = {};

  const mockHolidayRepo = {
    find: jest.fn(),
  };

  const mockLeaveRepo = {
    find: jest.fn(),
  };

  const mockPenalizationRecordRepo = {
    find: jest.fn(),
  };

  const mockCompensationRepo = {
    findOne: jest.fn(),
  };

  const mockBreakupRepo = {
    find: jest.fn(),
  };

  const mockDataSource = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollReportsService,
        {
          provide: getRepositoryToken(PayrollReport),
          useValue: mockReportRepo,
        },
        {
          provide: getRepositoryToken(PayrollReportDetail),
          useValue: mockDetailRepo,
        },
        {
          provide: getRepositoryToken(PayrollDailyDetail),
          useValue: mockDailyRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(EmployeeProfile),
          useValue: mockProfileRepo,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: mockAttendanceRepo,
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
          provide: getRepositoryToken(PenalizationRecord),
          useValue: mockPenalizationRecordRepo,
        },
        {
          provide: getRepositoryToken(Compensation),
          useValue: mockCompensationRepo,
        },
        {
          provide: getRepositoryToken(SalaryBreakup),
          useValue: mockBreakupRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PayrollReportsService>(PayrollReportsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all reports', async () => {
      const reports = [
        { id: 'r1', month: 3, year: 2026 },
        { id: 'r2', month: 2, year: 2026 },
      ];
      mockReportRepo.find.mockResolvedValue(reports);

      const result = await service.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if report not found', async () => {
      mockReportRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return report with details', async () => {
      const report = { id: 'r1', month: 3, year: 2026, details: [] };
      mockReportRepo.findOne.mockResolvedValue(report);

      const result = await service.findOne('r1');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('r1');
    });
  });

  describe('finalizeReport', () => {
    it('should throw NotFoundException if report not found', async () => {
      mockReportRepo.findOne.mockResolvedValue(null);

      await expect(service.finalizeReport('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw if already finalized', async () => {
      mockReportRepo.findOne.mockResolvedValue({
        id: 'r1',
        status: PayrollReportStatus.FINALIZED,
      });

      await expect(service.finalizeReport('r1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should finalize a draft report', async () => {
      const report = { id: 'r1', status: PayrollReportStatus.DRAFT };
      mockReportRepo.findOne.mockResolvedValue(report);
      mockReportRepo.save.mockResolvedValue({
        ...report,
        status: PayrollReportStatus.FINALIZED,
      });

      const result = await service.finalizeReport('r1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(PayrollReportStatus.FINALIZED);
    });
  });

  describe('getEmployeeDetail', () => {
    it('should throw NotFoundException if detail not found', async () => {
      mockDetailRepo.findOne.mockResolvedValue(null);

      await expect(service.getEmployeeDetail('r1', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return employee detail with sorted daily details', async () => {
      const detail = {
        id: 'd1',
        reportId: 'r1',
        userId: 'user-1',
        dailyDetails: [
          { workDate: '2026-03-15' },
          { workDate: '2026-03-01' },
          { workDate: '2026-03-10' },
        ],
      };
      mockDetailRepo.findOne.mockResolvedValue(detail);

      const result = await service.getEmployeeDetail('r1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data.dailyDetails![0].workDate).toBe('2026-03-01');
      expect(result.data.dailyDetails![2].workDate).toBe('2026-03-15');
    });
  });

  describe('exportCsv', () => {
    it('should throw NotFoundException if report not found', async () => {
      mockReportRepo.findOne.mockResolvedValue(null);

      await expect(service.exportCsv('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return a valid CSV string', async () => {
      const report = {
        id: 'r1',
        details: [
          {
            employeeName: 'John Doe',
            employeeNumber: 'EMP-001',
            department: 'Engineering',
            totalWorkingDays: 22,
            totalPresentDays: 20,
            totalLateDays: 2,
            totalHalfDays: 0,
            totalAbsentDays: 0,
            totalPaidLeaveDays: 2,
            totalUnpaidLeaveDays: 0,
            totalWeeklyOffDays: 8,
            totalHolidayDays: 1,
            totalWorkedMinutes: 10800,
            totalEffectiveMinutes: 9600,
            totalOvertimeMinutes: 600,
            totalPenaltyDeductionDays: 0,
            lopDays: 0,
            netPayableDays: 22,
            grossMonthlySalary: 50000,
            deductions: 0,
            netPayable: 50000,
          },
        ],
      };
      mockReportRepo.findOne.mockResolvedValue(report);

      const csv = await service.exportCsv('r1');

      expect(csv).toContain('Employee Name');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('Engineering');
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2);
    });
  });

  describe('generateReport', () => {
    it('should throw if trying to regenerate a finalized report', async () => {
      mockReportRepo.findOne.mockResolvedValue({
        id: 'r1',
        status: PayrollReportStatus.FINALIZED,
      });

      await expect(service.generateReport(3, 2026, 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should generate a report for an empty org', async () => {
      mockReportRepo.findOne.mockResolvedValue(null);
      mockUserRepo.find.mockResolvedValue([]);
      mockReportRepo.create.mockReturnValue({
        month: 3,
        year: 2026,
        status: PayrollReportStatus.DRAFT,
        totalEmployees: 0,
        totalWorkingDays: 0,
      });
      mockReportRepo.save.mockImplementation((r: PayrollReport) =>
        Promise.resolve({ ...r, id: 'r1' })
      );

      const result = await service.generateReport(3, 2026, null);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
