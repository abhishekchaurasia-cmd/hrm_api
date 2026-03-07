import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration, { configurationSchema } from './config/configuration.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { CompensationModule } from './modules/compensation/compensation.module.js';
import { DepartmentsModule } from './modules/departments/departments.module.js';
import { EmployeeOnboardingModule } from './modules/employee-onboarding/employee-onboarding.module.js';
import { HolidaysModule } from './modules/holidays/holidays.module.js';
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

    SharedModule,

    UsersModule,
    AttendanceModule,
    DepartmentsModule,
    ShiftsModule,
    LeavePoliciesModule,
    LeavesModule,
    OrganizationModule,
    HolidaysModule,
    CompensationModule,
    EmployeeOnboardingModule,
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
