import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration, { configurationSchema } from './config/configuration.js';
import { AttendanceAutomationModule } from './modules/attendance-automation/attendance-automation.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { CompensationModule } from './modules/compensation/compensation.module.js';
import { DepartmentsModule } from './modules/departments/departments.module.js';
import { EmployeeOnboardingModule } from './modules/employee-onboarding/employee-onboarding.module.js';
import { HolidaysModule } from './modules/holidays/holidays.module.js';
import { PayrollReportsModule } from './modules/payroll-reports/payroll-reports.module.js';
import { PenalizationPoliciesModule } from './modules/penalization-policies/penalization-policies.module.js';
import { RegularizationsModule } from './modules/regularizations/regularizations.module.js';
import { TimeTrackingPoliciesModule } from './modules/time-tracking-policies/time-tracking-policies.module.js';
import { LeavePoliciesModule } from './modules/leave-policies/leave-policies.module.js';
import { LeavesModule } from './modules/leaves/leaves.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { ShiftsModule } from './modules/shifts/shifts.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor.js';
import { SharedModule } from './shared/shared.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configurationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('security.rateLimitTtl', 60) * 1000,
          limit: configService.get<number>('security.rateLimitLimit', 100),
        },
      ],
    }),

    ScheduleModule.forRoot(),

    SharedModule,

    UsersModule,
    AttendanceModule,
    AttendanceAutomationModule,
    DepartmentsModule,
    ShiftsModule,
    LeavePoliciesModule,
    LeavesModule,
    OrganizationModule,
    HolidaysModule,
    CompensationModule,
    EmployeeOnboardingModule,
    PayrollReportsModule,
    PenalizationPoliciesModule,
    RegularizationsModule,
    TimeTrackingPoliciesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
