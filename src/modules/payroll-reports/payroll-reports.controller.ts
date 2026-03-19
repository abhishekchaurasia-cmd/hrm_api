import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { UserRole } from '../users/entities/user.entity.js';

import { GeneratePayrollReportDto } from './dto/generate-payroll-report.dto.js';
import { PayrollReportsService } from './payroll-reports.service.js';

@ApiTags('payroll-reports')
@ApiBearerAuth()
@Controller('api/v1/payroll-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollReportsController {
  constructor(private readonly payrollReportsService: PayrollReportsService) {}

  @Post('generate')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Generate payroll report for a month (HR only)' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  generate(
    @Body() dto: GeneratePayrollReportDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.payrollReportsService.generateReport(
      dto.month,
      dto.year,
      user.id
    );
  }

  @Get()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'List all payroll reports (HR only)' })
  @ApiResponse({ status: 200, description: 'Reports retrieved' })
  findAll() {
    return this.payrollReportsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get payroll report by ID (HR only)' })
  @ApiResponse({ status: 200, description: 'Report retrieved' })
  findOne(@Param('id') id: string) {
    return this.payrollReportsService.findOne(id);
  }

  @Get(':id/employees/:userId')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get employee detail in a report (HR only)' })
  @ApiResponse({ status: 200, description: 'Employee detail retrieved' })
  getEmployeeDetail(@Param('id') id: string, @Param('userId') userId: string) {
    return this.payrollReportsService.getEmployeeDetail(id, userId);
  }

  @Get(':id/export/csv')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Export payroll report as CSV (HR only)' })
  @ApiResponse({ status: 200, description: 'CSV file downloaded' })
  async exportCsv(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.payrollReportsService.exportCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payroll-report-${id}.csv`
    );
    res.send(csv);
  }

  @Patch(':id/finalize')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Finalize payroll report (HR only)' })
  @ApiResponse({ status: 200, description: 'Report finalized' })
  finalize(@Param('id') id: string) {
    return this.payrollReportsService.finalizeReport(id);
  }
}
