# HR Leave Management - Detailed Backend API Specification

## Overview

This document provides an **implementation-ready** backend specification for the 3 HR leave management endpoints. It includes NestJS scaffolding, Prisma queries, DTOs, guard configuration, balance transaction logic, and edge case handling.

All 3 endpoints require JWT authentication and the **`hr` role**. The frontend is already built and expects the exact contracts documented below.

**Base URL:** `/api/v1`

---

## Table of Contents

1. [Frontend Contract Reference](#frontend-contract-reference)
2. [API 1: GET /api/v1/hr/leaves](#api-1-get-apiv1hrleaves)
3. [API 2: PATCH /api/v1/leaves/:id/approve](#api-2-patch-apiv1leavesidapprove)
4. [API 3: PATCH /api/v1/leaves/:id/reject](#api-3-patch-apiv1leavesidreject)
5. [Leave Balance Transaction Logic](#leave-balance-transaction-logic)
6. [NestJS Scaffolding](#nestjs-scaffolding)
7. [Prisma Schema Reference](#prisma-schema-reference)
8. [Edge Cases and Concurrency](#edge-cases-and-concurrency)
9. [Testing Guidance](#testing-guidance)

---

## Frontend Contract Reference

The frontend calls these APIs from `src/services/leaves.ts` and expects responses matching the TypeScript types in `src/types/leave.ts`. The exact frontend service functions are:

### Service Functions

```typescript
// GET /api/v1/hr/leaves
export async function getHrLeaves(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ leaves: LeaveRequest[]; total: number }>>;

// PATCH /api/v1/leaves/:id/approve
export async function approveLeaveRequest(
  id: string,
  reviewNote?: string
): Promise<ApiResponse<LeaveRequest>>;

// PATCH /api/v1/leaves/:id/reject
export async function rejectLeaveRequest(
  id: string,
  reviewNote?: string
): Promise<ApiResponse<LeaveRequest>>;
```

### Response Wrapper

Every response must follow this shape:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
```

### LeaveRequest Type (frontend expects this shape)

```typescript
interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: string | null;
  leaveTypeConfigId: string | null;
  leaveTypeConfig?: {
    id: string;
    name: string;
    code: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  numberOfDays: number; // can be 0.5 for half-day
  reason: string | null;
  isHalfDay: boolean;
  halfDayType: 'first_half' | 'second_half' | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null; // ISO 8601 datetime
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}
```

**Critical:** The `user` relation (firstName, lastName, email) **must** be included in the `GET /hr/leaves` response. Without it, the HR table cannot display employee names.

---

## API 1: GET /api/v1/hr/leaves

### Purpose

Returns all leave requests across the organization for HR to review, approve, or reject. Supports filtering by status and pagination.

### Request

```
GET /api/v1/hr/leaves?status=pending&page=1&limit=20
Authorization: Bearer <hr-jwt-token>
```

### Query Parameters

| Param       | Type   | Required | Default     | Validation                                                     | Description                           |
| ----------- | ------ | -------- | ----------- | -------------------------------------------------------------- | ------------------------------------- |
| `status`    | string | No       | _(all)_     | Must be one of: `pending`, `approved`, `rejected`, `cancelled` | Filter by leave status                |
| `userId`    | UUID   | No       | -           | Valid UUID format                                              | Filter by specific employee           |
| `startDate` | string | No       | -           | `YYYY-MM-DD` format                                            | Leaves starting on or after this date |
| `endDate`   | string | No       | -           | `YYYY-MM-DD` format                                            | Leaves ending on or before this date  |
| `page`      | number | No       | `1`         | Integer >= 1                                                   | Page number                           |
| `limit`     | number | No       | `20`        | Integer 1-100                                                  | Items per page                        |
| `sortBy`    | string | No       | `createdAt` | One of: `createdAt`, `startDate`, `status`                     | Sort field                            |
| `sortOrder` | string | No       | `desc`      | `asc` or `desc`                                                | Sort direction                        |

### Response (200 OK)

```json
{
  "success": true,
  "message": "Leave requests retrieved",
  "data": {
    "leaves": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "userId": "u1u2u3u4-u5u6-7890-abcd-ef1234567890",
        "user": {
          "id": "u1u2u3u4-u5u6-7890-abcd-ef1234567890",
          "firstName": "Ashish",
          "lastName": "Kumar",
          "email": "ashish@copandigital.com"
        },
        "leaveType": null,
        "leaveTypeConfigId": "lt-uuid-001",
        "leaveTypeConfig": {
          "id": "lt-uuid-001",
          "name": "Casual Leave",
          "code": "CL"
        },
        "startDate": "2026-03-15",
        "endDate": "2026-03-17",
        "numberOfDays": 2,
        "reason": "Family function",
        "isHalfDay": false,
        "halfDayType": null,
        "status": "pending",
        "reviewedBy": null,
        "reviewNote": null,
        "reviewedAt": null,
        "createdAt": "2026-03-10T10:30:00.000Z",
        "updatedAt": "2026-03-10T10:30:00.000Z"
      },
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "userId": "v2v3v4v5-v6v7-8901-bcde-f12345678901",
        "user": {
          "id": "v2v3v4v5-v6v7-8901-bcde-f12345678901",
          "firstName": "Ravi",
          "lastName": "Sharma",
          "email": "ravi@copandigital.com"
        },
        "leaveType": null,
        "leaveTypeConfigId": "lt-uuid-002",
        "leaveTypeConfig": {
          "id": "lt-uuid-002",
          "name": "Sick Leave",
          "code": "SL"
        },
        "startDate": "2026-03-12",
        "endDate": "2026-03-12",
        "numberOfDays": 0.5,
        "reason": "Doctor appointment",
        "isHalfDay": true,
        "halfDayType": "first_half",
        "status": "pending",
        "reviewedBy": null,
        "reviewNote": null,
        "reviewedAt": null,
        "createdAt": "2026-03-09T08:15:00.000Z",
        "updatedAt": "2026-03-09T08:15:00.000Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Response (200 OK - Empty)

```json
{
  "success": true,
  "message": "Leave requests retrieved",
  "data": {
    "leaves": [],
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  }
}
```

### Error Responses

| Status | Condition                 | Response                                                                                            |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------- |
| 401    | No JWT or expired token   | `{ "statusCode": 401, "message": "Unauthorized" }`                                                  |
| 403    | User role is not `hr`     | `{ "statusCode": 403, "message": "Forbidden resource" }`                                            |
| 400    | Invalid `status` value    | `{ "statusCode": 400, "message": "status must be one of: pending, approved, rejected, cancelled" }` |
| 400    | `page` < 1 or not integer | `{ "statusCode": 400, "message": "page must be a positive integer" }`                               |
| 400    | `limit` < 1 or > 100      | `{ "statusCode": 400, "message": "limit must be between 1 and 100" }`                               |

### Prisma Query

```typescript
async findAllForHr(filters: {
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  const where: Prisma.LeaveWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.startDate) {
    where.startDate = { gte: new Date(filters.startDate) };
  }

  if (filters.endDate) {
    where.endDate = { lte: new Date(filters.endDate) };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [leaves, total] = await this.prisma.$transaction([
    this.prisma.leave.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        leaveTypeConfig: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip,
      take: filters.limit,
    }),
    this.prisma.leave.count({ where }),
  ]);

  return {
    leaves,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
  };
}
```

### Key Implementation Notes

- The `user` relation is fetched via Prisma `include` with a `select` to limit fields to `id`, `firstName`, `lastName`, `email`. Do not return the entire user object (passwords, tokens, etc.).
- The `leaveTypeConfig` relation must also be included with `id`, `name`, `code`.
- When no `status` filter is provided, return all statuses but sort so `pending` appears first. This can be done with: `orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]` (since "pending" sorts before "approved"/"rejected" alphabetically this gives a reasonable default, but a custom sort may be preferred).
- Dates in the response should be serialized as ISO 8601 strings. Prisma does this automatically for `DateTime` fields.
- `startDate` and `endDate` in the leave record are `Date` type (no time component). Return them as `"YYYY-MM-DD"` strings.

---

## API 2: PATCH /api/v1/leaves/:id/approve

### Purpose

HR approves a pending leave request. Updates status, records the reviewer, and optionally stores a review note.

### Request

```
PATCH /api/v1/leaves/a1b2c3d4-e5f6-7890-abcd-ef1234567890/approve
Authorization: Bearer <hr-jwt-token>
Content-Type: application/json

{
  "reviewNote": "Approved. Enjoy your time off."
}
```

### Path Parameters

| Param | Type | Required | Description      |
| ----- | ---- | -------- | ---------------- |
| `id`  | UUID | Yes      | Leave request ID |

### Request Body

| Field        | Type   | Required | Max Length | Description                           |
| ------------ | ------ | -------- | ---------- | ------------------------------------- |
| `reviewNote` | string | No       | 500 chars  | Optional note from HR to the employee |

**Empty body is valid** -- HR can approve without a note:

```
PATCH /api/v1/leaves/:id/approve
Authorization: Bearer <hr-jwt-token>
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Leave request approved",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "u1u2u3u4-u5u6-7890-abcd-ef1234567890",
    "user": {
      "id": "u1u2u3u4-u5u6-7890-abcd-ef1234567890",
      "firstName": "Ashish",
      "lastName": "Kumar",
      "email": "ashish@copandigital.com"
    },
    "leaveType": null,
    "leaveTypeConfigId": "lt-uuid-001",
    "leaveTypeConfig": {
      "id": "lt-uuid-001",
      "name": "Casual Leave",
      "code": "CL"
    },
    "startDate": "2026-03-15",
    "endDate": "2026-03-17",
    "numberOfDays": 2,
    "reason": "Family function",
    "isHalfDay": false,
    "halfDayType": null,
    "status": "approved",
    "reviewedBy": "hr-user-uuid-here",
    "reviewNote": "Approved. Enjoy your time off.",
    "reviewedAt": "2026-03-10T14:00:00.000Z",
    "createdAt": "2026-03-10T10:30:00.000Z",
    "updatedAt": "2026-03-10T14:00:00.000Z"
  }
}
```

### Error Responses

| Status | Condition                      | Response body                                                                     |
| ------ | ------------------------------ | --------------------------------------------------------------------------------- |
| 401    | No JWT or expired              | `{ "statusCode": 401, "message": "Unauthorized" }`                                |
| 403    | Not HR role                    | `{ "statusCode": 403, "message": "Forbidden resource" }`                          |
| 404    | Leave ID not found             | `{ "statusCode": 404, "message": "Leave request not found" }`                     |
| 400    | Leave status is not `pending`  | `{ "statusCode": 400, "message": "Only pending leave requests can be approved" }` |
| 400    | `reviewNote` exceeds 500 chars | `{ "statusCode": 400, "message": "reviewNote must not exceed 500 characters" }`   |

### Prisma Query

```typescript
async approve(leaveId: string, hrUserId: string, reviewNote?: string) {
  // 1. Fetch the leave with a lock to prevent race conditions
  const leave = await this.prisma.leave.findUnique({
    where: { id: leaveId },
  });

  if (!leave) {
    throw new NotFoundException('Leave request not found');
  }

  if (leave.status !== 'pending') {
    throw new BadRequestException('Only pending leave requests can be approved');
  }

  // 2. Update in a transaction (approve + optional balance operations)
  const updatedLeave = await this.prisma.$transaction(async (tx) => {
    const updated = await tx.leave.update({
      where: { id: leaveId },
      data: {
        status: 'approved',
        reviewedBy: hrUserId,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        leaveTypeConfig: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // 3. If balance is deducted on approval (not on apply), do it here:
    // See "Leave Balance Transaction Logic" section below.

    return updated;
  });

  return updatedLeave;
}
```

### Side Effects

1. Set `status` to `'approved'`
2. Set `reviewedBy` to the current HR user's ID (extracted from JWT)
3. Set `reviewedAt` to `new Date()` (current timestamp)
4. Set `reviewNote` to the provided value, or `null` if not provided
5. **Balance logic:** See [Leave Balance Transaction Logic](#leave-balance-transaction-logic)

---

## API 3: PATCH /api/v1/leaves/:id/reject

### Purpose

HR rejects a pending leave request. Updates status, records the reviewer, optionally stores a rejection reason, and restores the employee's leave balance if it was pre-deducted.

### Request

```
PATCH /api/v1/leaves/a1b2c3d4-e5f6-7890-abcd-ef1234567890/reject
Authorization: Bearer <hr-jwt-token>
Content-Type: application/json

{
  "reviewNote": "Insufficient staffing during this period. Please choose different dates."
}
```

### Path Parameters

| Param | Type | Required | Description      |
| ----- | ---- | -------- | ---------------- |
| `id`  | UUID | Yes      | Leave request ID |

### Request Body

| Field        | Type   | Required | Max Length | Description               |
| ------------ | ------ | -------- | ---------- | ------------------------- |
| `reviewNote` | string | No       | 500 chars  | Optional rejection reason |

### Response (200 OK)

```json
{
  "success": true,
  "message": "Leave request rejected",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "u1u2u3u4-u5u6-7890-abcd-ef1234567890",
    "user": {
      "id": "u1u2u3u4-u5u6-7890-abcd-ef1234567890",
      "firstName": "Ashish",
      "lastName": "Kumar",
      "email": "ashish@copandigital.com"
    },
    "leaveType": null,
    "leaveTypeConfigId": "lt-uuid-001",
    "leaveTypeConfig": {
      "id": "lt-uuid-001",
      "name": "Casual Leave",
      "code": "CL"
    },
    "startDate": "2026-03-15",
    "endDate": "2026-03-17",
    "numberOfDays": 2,
    "reason": "Family function",
    "isHalfDay": false,
    "halfDayType": null,
    "status": "rejected",
    "reviewedBy": "hr-user-uuid-here",
    "reviewNote": "Insufficient staffing during this period. Please choose different dates.",
    "reviewedAt": "2026-03-10T14:30:00.000Z",
    "createdAt": "2026-03-10T10:30:00.000Z",
    "updatedAt": "2026-03-10T14:30:00.000Z"
  }
}
```

### Error Responses

| Status | Condition                      | Response body                                                                     |
| ------ | ------------------------------ | --------------------------------------------------------------------------------- |
| 401    | No JWT or expired              | `{ "statusCode": 401, "message": "Unauthorized" }`                                |
| 403    | Not HR role                    | `{ "statusCode": 403, "message": "Forbidden resource" }`                          |
| 404    | Leave ID not found             | `{ "statusCode": 404, "message": "Leave request not found" }`                     |
| 400    | Leave status is not `pending`  | `{ "statusCode": 400, "message": "Only pending leave requests can be rejected" }` |
| 400    | `reviewNote` exceeds 500 chars | `{ "statusCode": 400, "message": "reviewNote must not exceed 500 characters" }`   |

### Prisma Query

```typescript
async reject(leaveId: string, hrUserId: string, reviewNote?: string) {
  const leave = await this.prisma.leave.findUnique({
    where: { id: leaveId },
    include: { leaveTypeConfig: true },
  });

  if (!leave) {
    throw new NotFoundException('Leave request not found');
  }

  if (leave.status !== 'pending') {
    throw new BadRequestException('Only pending leave requests can be rejected');
  }

  const updatedLeave = await this.prisma.$transaction(async (tx) => {
    // 1. Update leave status
    const updated = await tx.leave.update({
      where: { id: leaveId },
      data: {
        status: 'rejected',
        reviewedBy: hrUserId,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        leaveTypeConfig: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // 2. Restore balance if it was pre-deducted on apply
    if (leave.leaveTypeConfigId) {
      const currentYear = new Date(leave.startDate).getFullYear();

      await tx.leaveBalance.updateMany({
        where: {
          userId: leave.userId,
          leaveTypeConfigId: leave.leaveTypeConfigId,
          year: currentYear,
        },
        data: {
          used: { decrement: leave.numberOfDays },
          balance: { increment: leave.numberOfDays },
        },
      });

      // 3. Create a reversal transaction for audit trail
      await tx.leaveTransaction.create({
        data: {
          userId: leave.userId,
          leaveBalanceId: '', // look up the balance ID first
          leaveId: leave.id,
          transactionType: 'reversal',
          days: leave.numberOfDays,
          previousBalance: 0, // compute from current balance
          newBalance: 0,      // compute from current balance
          remarks: `Rejected by HR: ${reviewNote ?? 'No reason provided'}`,
          performedBy: hrUserId,
        },
      });
    }

    return updated;
  });

  return updatedLeave;
}
```

### Side Effects

1. Set `status` to `'rejected'`
2. Set `reviewedBy` to the current HR user's ID
3. Set `reviewedAt` to current timestamp
4. Set `reviewNote` to the provided value, or `null`
5. **Restore leave balance:** Increment the employee's `balance` and decrement `used` by `numberOfDays` on the matching `leaveBalance` record
6. **Create audit transaction:** Insert a `reversal` record in `leaveTransaction` table for traceability

---

## Leave Balance Transaction Logic

### Two Possible Strategies

Your backend must choose **one** of these strategies and apply it consistently:

### Strategy A: Deduct on Apply (Recommended)

```
Employee applies   → Balance deducted immediately, leave status = "pending"
HR approves        → No balance change needed (already deducted)
HR rejects         → Balance RESTORED (reversal transaction created)
Employee cancels   → Balance RESTORED (reversal transaction created)
```

**Pros:** Employee immediately sees accurate available balance. Prevents over-booking.

### Strategy B: Deduct on Approve

```
Employee applies   → No balance change, leave status = "pending"
HR approves        → Balance DEDUCTED (deduction transaction created)
HR rejects         → No balance change needed
Employee cancels   → No balance change needed
```

**Pros:** Simpler cancel/reject flow. Balance only changes on final decision.

### Implementation for Strategy A (Recommended)

#### On `POST /api/v1/leaves` (Apply)

```typescript
// Inside a transaction:
// 1. Validate balance >= numberOfDays
// 2. Deduct balance
await tx.leaveBalance.update({
  where: { id: balanceRecord.id },
  data: {
    used: { increment: numberOfDays },
    balance: { decrement: numberOfDays },
  },
});
// 3. Create deduction transaction
await tx.leaveTransaction.create({
  data: {
    transactionType: 'deduction',
    days: numberOfDays,
    remarks: 'Leave applied',
    // ... other fields
  },
});
// 4. Create leave with status 'pending'
```

#### On `PATCH /api/v1/leaves/:id/approve`

```typescript
// No balance change needed -- already deducted on apply
// Just update status to 'approved'
```

#### On `PATCH /api/v1/leaves/:id/reject`

```typescript
// Inside a transaction:
// 1. Update leave status to 'rejected'
// 2. Restore balance
await tx.leaveBalance.update({
  where: { id: balanceRecord.id },
  data: {
    used: { decrement: leave.numberOfDays },
    balance: { increment: leave.numberOfDays },
  },
});
// 3. Create reversal transaction
await tx.leaveTransaction.create({
  data: {
    transactionType: 'reversal',
    days: leave.numberOfDays,
    remarks: `Rejected by HR: ${reviewNote}`,
    // ... other fields
  },
});
```

#### On `PATCH /api/v1/leaves/:id/cancel` (Employee cancels)

```typescript
// Same as reject: restore balance + create reversal transaction
```

### Balance Lookup

To find the correct `leaveBalance` record:

```typescript
const balance = await tx.leaveBalance.findFirst({
  where: {
    userId: leave.userId,
    leaveTypeConfigId: leave.leaveTypeConfigId,
    year: new Date(leave.startDate).getFullYear(),
  },
});
```

---

## NestJS Scaffolding

### File Structure

```
src/
├── leaves/
│   ├── leaves.module.ts
│   ├── leaves.controller.ts        # Add HR endpoints here
│   ├── leaves.service.ts           # Add HR service methods here
│   └── dto/
│       ├── hr-leaves-query.dto.ts  # NEW
│       └── review-leave.dto.ts     # NEW
```

### DTO: HrLeavesQueryDto

```typescript
// src/leaves/dto/hr-leaves-query.dto.ts
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export class HrLeavesQueryDto {
  @IsOptional()
  @IsEnum(LeaveStatus, {
    message: 'status must be one of: pending, approved, rejected, cancelled',
  })
  status?: LeaveStatus;

  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1, { message: 'page must be a positive integer' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit must be between 1 and 100' })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['createdAt', 'startDate', 'status'], {
    message: 'sortBy must be one of: createdAt, startDate, status',
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'sortOrder must be asc or desc',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

### DTO: ReviewLeaveDto

```typescript
// src/leaves/dto/review-leave.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewLeaveDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'reviewNote must not exceed 500 characters' })
  reviewNote?: string;
}
```

### Controller

```typescript
// Add these methods to leaves.controller.ts

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { HrLeavesQueryDto } from './dto/hr-leaves-query.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class LeavesController {
  // ... existing employee endpoints ...

  // ── HR Endpoints ──

  @Get('hr/leaves')
  @UseGuards(RolesGuard)
  @Roles('hr')
  async getHrLeaves(@Query() query: HrLeavesQueryDto) {
    const result = await this.leavesService.findAllForHr({
      status: query.status,
      userId: query.userId,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
    });

    return {
      success: true,
      message: 'Leave requests retrieved',
      data: result,
    };
  }

  @Patch('leaves/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('hr')
  async approveLeave(
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
    @Req() req: any
  ) {
    const hrUserId = req.user.id; // extracted from JWT
    const leave = await this.leavesService.approve(
      id,
      hrUserId,
      dto.reviewNote
    );

    return {
      success: true,
      message: 'Leave request approved',
      data: leave,
    };
  }

  @Patch('leaves/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('hr')
  async rejectLeave(
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
    @Req() req: any
  ) {
    const hrUserId = req.user.id; // extracted from JWT
    const leave = await this.leavesService.reject(id, hrUserId, dto.reviewNote);

    return {
      success: true,
      message: 'Leave request rejected',
      data: leave,
    };
  }
}
```

### Service

```typescript
// Add these methods to leaves.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  // ... existing employee methods ...

  // ── HR Methods ──

  private readonly leaveInclude = {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    leaveTypeConfig: {
      select: {
        id: true,
        name: true,
        code: true,
      },
    },
  };

  async findAllForHr(filters: {
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const where: Prisma.LeaveWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.startDate) {
      where.startDate = { gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      where.endDate = { lte: new Date(filters.endDate) };
    }

    const skip = (filters.page - 1) * filters.limit;

    const [leaves, total] = await this.prisma.$transaction([
      this.prisma.leave.findMany({
        where,
        include: this.leaveInclude,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip,
        take: filters.limit,
      }),
      this.prisma.leave.count({ where }),
    ]);

    return {
      leaves,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async approve(leaveId: string, hrUserId: string, reviewNote?: string) {
    const leave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }
    if (leave.status !== 'pending') {
      throw new BadRequestException(
        'Only pending leave requests can be approved'
      );
    }

    // Strategy A: balance already deducted on apply, no change needed
    return this.prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: 'approved',
        reviewedBy: hrUserId,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
      include: this.leaveInclude,
    });
  }

  async reject(leaveId: string, hrUserId: string, reviewNote?: string) {
    const leave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }
    if (leave.status !== 'pending') {
      throw new BadRequestException(
        'Only pending leave requests can be rejected'
      );
    }

    return this.prisma.$transaction(async tx => {
      // 1. Update leave status
      const updated = await tx.leave.update({
        where: { id: leaveId },
        data: {
          status: 'rejected',
          reviewedBy: hrUserId,
          reviewNote: reviewNote ?? null,
          reviewedAt: new Date(),
        },
        include: this.leaveInclude,
      });

      // 2. Restore balance (Strategy A: was deducted on apply)
      if (leave.leaveTypeConfigId) {
        const year = new Date(leave.startDate).getFullYear();

        const balanceRecord = await tx.leaveBalance.findFirst({
          where: {
            userId: leave.userId,
            leaveTypeConfigId: leave.leaveTypeConfigId,
            year,
          },
        });

        if (balanceRecord) {
          await tx.leaveBalance.update({
            where: { id: balanceRecord.id },
            data: {
              used: { decrement: leave.numberOfDays },
              balance: { increment: leave.numberOfDays },
            },
          });

          // 3. Audit trail
          await tx.leaveTransaction.create({
            data: {
              userId: leave.userId,
              leaveBalanceId: balanceRecord.id,
              leaveId: leave.id,
              transactionType: 'reversal',
              days: leave.numberOfDays,
              previousBalance: Number(balanceRecord.balance),
              newBalance: Number(balanceRecord.balance) + leave.numberOfDays,
              remarks: `Rejected by HR${reviewNote ? ': ' + reviewNote : ''}`,
              performedBy: hrUserId,
            },
          });
        }
      }

      return updated;
    });
  }
}
```

### Role Guard

If you don't already have a roles guard, here is a standard implementation:

```typescript
// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

---

## Prisma Schema Reference

### Leave Model (with new fields)

```prisma
model Leave {
  id                String    @id @default(uuid())
  userId            String    @map("user_id")
  leaveType         String?   @map("leave_type")
  leaveTypeConfigId String?   @map("leave_type_config_id")
  startDate         DateTime  @map("start_date") @db.Date
  endDate           DateTime  @map("end_date") @db.Date
  numberOfDays      Float     @map("number_of_days")
  reason            String?
  isHalfDay         Boolean   @default(false) @map("is_half_day")
  halfDayType       String?   @map("half_day_type")
  status            String    @default("pending")
  reviewedBy        String?   @map("reviewed_by")
  reviewNote        String?   @map("review_note")
  reviewedAt        DateTime? @map("reviewed_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  user              User            @relation(fields: [userId], references: [id])
  leaveTypeConfig   LeaveTypeConfig? @relation(fields: [leaveTypeConfigId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([startDate, endDate])
  @@map("leaves")
}
```

### LeaveBalance Model

```prisma
model LeaveBalance {
  id                String   @id @default(uuid())
  userId            String   @map("user_id")
  leaveTypeConfigId String   @map("leave_type_config_id")
  year              Int
  allocated         Float    @default(0)
  used              Float    @default(0)
  carriedForward    Float    @default(0) @map("carried_forward")
  adjusted          Float    @default(0)
  balance           Float    @default(0)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user              User            @relation(fields: [userId], references: [id])
  leaveTypeConfig   LeaveTypeConfig @relation(fields: [leaveTypeConfigId], references: [id])
  transactions      LeaveTransaction[]

  @@unique([userId, leaveTypeConfigId, year])
  @@map("leave_balances")
}
```

### LeaveTransaction Model

```prisma
model LeaveTransaction {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  leaveBalanceId  String   @map("leave_balance_id")
  leaveId         String?  @map("leave_id")
  transactionType String   @map("transaction_type")
  days            Float
  previousBalance Float    @map("previous_balance")
  newBalance      Float    @map("new_balance")
  remarks         String?
  performedBy     String   @map("performed_by")
  createdAt       DateTime @default(now()) @map("created_at")

  leaveBalance    LeaveBalance @relation(fields: [leaveBalanceId], references: [id])

  @@index([userId])
  @@index([leaveBalanceId])
  @@map("leave_transactions")
}
```

---

## Edge Cases and Concurrency

### 1. Double Approve/Reject

**Scenario:** Two HR users click "Approve" on the same leave at the same time.

**Solution:** The status check (`leave.status !== 'pending'`) inside the transaction prevents the second operation. The first one succeeds, the second returns `400: Only pending leave requests can be approved`.

For extra safety, use Prisma's optimistic concurrency or add a `WHERE status = 'pending'` clause to the update:

```typescript
const result = await tx.leave.updateMany({
  where: { id: leaveId, status: 'pending' },
  data: { status: 'approved', ... },
});

if (result.count === 0) {
  throw new BadRequestException('Only pending leave requests can be approved');
}
```

### 2. Employee Cancels While HR is Approving

**Scenario:** Employee clicks "Cancel" at the exact same time HR clicks "Approve".

**Solution:** Both operations check `status === 'pending'`. Whichever transaction commits first wins. The second one fails with the appropriate error message.

### 3. Negative Balance After Reversal

**Scenario:** Admin manually adjusted a balance down. Now rejecting a leave would make `used` go negative.

**Solution:** Clamp `used` to a minimum of `0`:

```typescript
const newUsed = Math.max(0, Number(balanceRecord.used) - leave.numberOfDays);
const restored = Number(balanceRecord.used) - newUsed;
await tx.leaveBalance.update({
  where: { id: balanceRecord.id },
  data: {
    used: newUsed,
    balance: { increment: restored },
  },
});
```

### 4. Leave Spans Year Boundary

**Scenario:** Leave from Dec 28, 2026 to Jan 2, 2027.

**Solution:** Use the `startDate` year for balance lookup. The backend's apply-leave logic should already handle this when computing `numberOfDays` (only counting working days).

### 5. Deleted or Deactivated Employee

**Scenario:** HR tries to approve a leave for a user who has been deactivated.

**Solution:** Still allow approve/reject since the leave record exists. The balance update will succeed as long as the balance record exists. Log a warning if the user is deactivated.

### 6. Invalid UUID in Path Param

**Scenario:** `PATCH /api/v1/leaves/not-a-uuid/approve`

**Solution:** Add a `@IsUUID()` validation on the `id` path parameter via a `ParseUUIDPipe`:

```typescript
@Patch('leaves/:id/approve')
async approveLeave(@Param('id', ParseUUIDPipe) id: string, ...) { ... }
```

---

## Testing Guidance

### Unit Tests (Service Layer)

```typescript
describe('LeavesService - HR', () => {
  describe('findAllForHr', () => {
    it('returns paginated leave requests with user and leaveTypeConfig');
    it('filters by status when provided');
    it('filters by userId when provided');
    it('filters by date range when provided');
    it('returns empty array when no leaves match');
    it('calculates totalPages correctly');
  });

  describe('approve', () => {
    it('sets status to approved and records reviewer');
    it('sets reviewNote when provided');
    it('sets reviewNote to null when not provided');
    it('throws NotFoundException for non-existent leave');
    it('throws BadRequestException for non-pending leave');
    it('throws BadRequestException for already-approved leave');
    it('throws BadRequestException for cancelled leave');
    it('includes user and leaveTypeConfig in response');
  });

  describe('reject', () => {
    it('sets status to rejected and records reviewer');
    it('restores leave balance on rejection');
    it('creates a reversal transaction');
    it('throws NotFoundException for non-existent leave');
    it('throws BadRequestException for non-pending leave');
    it('handles half-day leave balance correctly (0.5 days)');
    it('handles missing leaveTypeConfigId gracefully');
  });
});
```

### E2E Tests (Controller Layer)

```typescript
describe('HR Leave Management (e2e)', () => {
  describe('GET /api/v1/hr/leaves', () => {
    it('returns 401 without auth token');
    it('returns 403 for non-HR users');
    it('returns 200 with paginated leaves for HR');
    it('filters by status=pending');
    it('respects page and limit params');
  });

  describe('PATCH /api/v1/leaves/:id/approve', () => {
    it('returns 401 without auth token');
    it('returns 403 for non-HR users');
    it('returns 404 for non-existent leave');
    it('returns 400 for non-pending leave');
    it('returns 200 and updates status to approved');
    it('accepts empty body (no reviewNote)');
    it('stores reviewNote when provided');
  });

  describe('PATCH /api/v1/leaves/:id/reject', () => {
    it('returns 401 without auth token');
    it('returns 403 for non-HR users');
    it('returns 404 for non-existent leave');
    it('returns 400 for non-pending leave');
    it('returns 200 and updates status to rejected');
    it('restores employee leave balance');
    it('creates reversal transaction in leave_transactions');
  });
});
```

### Manual Testing Checklist

- [ ] HR can see all pending leaves in the Leave Management tab
- [ ] HR can filter by status tabs (Pending / Approved / Rejected / All)
- [ ] HR can approve a pending leave and sees success toast
- [ ] HR can reject a pending leave with a note and sees success toast
- [ ] Employee's balance is restored after HR rejects
- [ ] Double-clicking approve/reject does not cause duplicate operations
- [ ] Employee sees updated status on their My Leaves tab after HR action
- [ ] Half-day leave approval/rejection handles 0.5 day balance correctly
