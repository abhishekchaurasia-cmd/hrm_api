# Admin Shift & Leave Policy - Frontend Integration Guide

This document covers the full API contract and frontend integration details for the **Shift Management**, **Leave Policy**, and **Attendance** features. All endpoints described here are **HR-only** unless explicitly noted.

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Shift Management APIs](#2-shift-management-apis)
3. [Shift Assignment APIs](#3-shift-assignment-apis)
4. [Leave Plan APIs](#4-leave-plan-apis)
5. [Leave Type Config APIs](#5-leave-type-config-apis)
6. [Leave Plan Assignment APIs](#6-leave-plan-assignment-apis)
7. [Leave Balance APIs](#7-leave-balance-apis)
8. [Leave Transaction APIs](#8-leave-transaction-apis)
9. [Year-End Processing API](#9-year-end-processing-api)
10. [Modified Leave Application API](#10-modified-leave-application-api)
11. [Modified Attendance API](#11-modified-attendance-api)
12. [Admin Page Routing Structure](#12-admin-page-routing-structure)
13. [Component Hierarchy](#13-component-hierarchy)
14. [Form Validation Rules](#14-form-validation-rules)
15. [Error Handling Patterns](#15-error-handling-patterns)
16. [State Management Approach](#16-state-management-approach)

---

## 1. Authentication & Authorization

All admin endpoints require:

```
Authorization: Bearer <access_token>
```

The logged-in user must have `role: "hr"`. Any non-HR user will receive:

```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this"
}
```

Frontend should check `user.role === 'hr'` before rendering admin routes and redirect non-HR users to the dashboard.

---

## 2. Shift Management APIs

### POST /api/v1/shifts — Create a shift

**Request:**

```json
{
  "name": "India Regular",
  "code": "IN-CS",
  "startTime": "09:00",
  "endTime": "18:00",
  "breakDurationMinutes": 60,
  "workHoursPerDay": 8.0,
  "isFlexible": false,
  "graceMinutes": 15,
  "isDefault": true
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Shift created",
  "data": {
    "id": "uuid",
    "name": "India Regular",
    "code": "IN-CS",
    "startTime": "09:00:00",
    "endTime": "18:00:00",
    "breakDurationMinutes": 60,
    "workHoursPerDay": "8.00",
    "isFlexible": false,
    "graceMinutes": 15,
    "isDefault": true,
    "isActive": true,
    "createdAt": "2026-03-06T...",
    "updatedAt": "2026-03-06T..."
  }
}
```

### GET /api/v1/shifts — List all active shifts

**Response (200):**

```json
{
  "success": true,
  "message": "Shifts retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "India Regular",
      "code": "IN-CS",
      "startTime": "09:00:00",
      "endTime": "18:00:00",
      "breakDurationMinutes": 60,
      "workHoursPerDay": "8.00",
      "isFlexible": false,
      "graceMinutes": 15,
      "isDefault": true,
      "isActive": true,
      "weeklyOffs": [
        { "id": "uuid", "dayOfWeek": 0, "isFullDay": true },
        { "id": "uuid", "dayOfWeek": 6, "isFullDay": true }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### GET /api/v1/shifts/:id — Get shift details

Same shape as a single item from the list response, with `weeklyOffs` included.

### PATCH /api/v1/shifts/:id — Update a shift

Send only the fields to update. Same request fields as POST.

### DELETE /api/v1/shifts/:id — Deactivate a shift

**Response (200):**

```json
{
  "success": true,
  "message": "Shift deactivated",
  "data": null
}
```

### PUT /api/v1/shifts/:id/weekly-offs — Set weekly off pattern

Replaces all existing weekly offs for the shift.

**Request:**

```json
{
  "weeklyOffs": [
    { "dayOfWeek": 0, "isFullDay": true },
    { "dayOfWeek": 6, "isFullDay": true }
  ]
}
```

`dayOfWeek` values: `0` = Sunday, `1` = Monday, ..., `6` = Saturday.

**Response (200):**

```json
{
  "success": true,
  "message": "Weekly offs updated",
  "data": [
    {
      "id": "uuid",
      "shiftId": "uuid",
      "dayOfWeek": 0,
      "isFullDay": true,
      "createdAt": "..."
    },
    {
      "id": "uuid",
      "shiftId": "uuid",
      "dayOfWeek": 6,
      "isFullDay": true,
      "createdAt": "..."
    }
  ]
}
```

---

## 3. Shift Assignment APIs

### POST /api/v1/shift-assignments — Assign shift to employee

Automatically deactivates any prior active assignment for the employee.

**Request:**

```json
{
  "userId": "employee-uuid",
  "shiftId": "shift-uuid",
  "effectiveFrom": "2026-01-01",
  "effectiveTo": null
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Shift assigned",
  "data": {
    "id": "uuid",
    "userId": "employee-uuid",
    "shiftId": "shift-uuid",
    "effectiveFrom": "2026-01-01",
    "effectiveTo": null,
    "assignedBy": "hr-user-uuid",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### GET /api/v1/shift-assignments — List assignments

**Query parameters:**

| Param   | Type | Required | Description        |
| ------- | ---- | -------- | ------------------ |
| userId  | UUID | No       | Filter by employee |
| shiftId | UUID | No       | Filter by shift    |

### GET /api/v1/shift-assignments/employee/:userId — Get employee's current shift

Returns the active assignment with full shift details including weekly offs.

**Response (200):**

```json
{
  "success": true,
  "message": "Current shift assignment retrieved",
  "data": {
    "id": "uuid",
    "userId": "employee-uuid",
    "shiftId": "shift-uuid",
    "effectiveFrom": "2026-01-01",
    "effectiveTo": null,
    "isActive": true,
    "shift": {
      "id": "shift-uuid",
      "name": "India Regular",
      "code": "IN-CS",
      "startTime": "09:00:00",
      "endTime": "18:00:00",
      "workHoursPerDay": "8.00",
      "weeklyOffs": [
        { "dayOfWeek": 0, "isFullDay": true },
        { "dayOfWeek": 6, "isFullDay": true }
      ]
    }
  }
}
```

### PATCH /api/v1/shift-assignments/:id — Update assignment

### DELETE /api/v1/shift-assignments/:id — Remove assignment

---

## 4. Leave Plan APIs

### POST /api/v1/leave-plans — Create a leave plan

**Request:**

```json
{
  "name": "Leave Plan 2026",
  "year": 2026,
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "description": "Annual leave plan for all employees"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Leave plan created",
  "data": {
    "id": "uuid",
    "name": "Leave Plan 2026",
    "year": 2026,
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "description": "Annual leave plan for all employees",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### GET /api/v1/leave-plans — List all leave plans

Returns plans with their `leaveTypeConfigs` nested.

### GET /api/v1/leave-plans/:id — Get plan with leave types

### PATCH /api/v1/leave-plans/:id — Update plan

### DELETE /api/v1/leave-plans/:id — Deactivate plan

---

## 5. Leave Type Config APIs

These are nested under a leave plan.

### POST /api/v1/leave-plans/:planId/leave-types — Add leave type

**Request:**

```json
{
  "name": "Sick Leave",
  "code": "SL",
  "quota": 6.0,
  "isUnlimited": false,
  "isPaid": true,
  "yearEndAction": "reset_to_zero",
  "maxCarryForward": null,
  "carryForwardExpiryDays": null,
  "isEncashable": false
}
```

**yearEndAction enum values:**

| Value                   | Description                                |
| ----------------------- | ------------------------------------------ |
| `reset_to_zero`         | Remaining balance resets to 0 at year end  |
| `carry_forward_all`     | All remaining balance carries to next year |
| `carry_forward_limited` | Carry forward up to `maxCarryForward` days |
| `none`                  | No carry forward, no reset                 |

**Response (201):**

```json
{
  "success": true,
  "message": "Leave type added",
  "data": {
    "id": "uuid",
    "leavePlanId": "plan-uuid",
    "name": "Sick Leave",
    "code": "SL",
    "quota": "6.0",
    "isUnlimited": false,
    "isPaid": true,
    "yearEndAction": "reset_to_zero",
    "maxCarryForward": null,
    "carryForwardExpiryDays": null,
    "isEncashable": false,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Common leave type configurations (matching Keka):**

```
Sick Leave:     quota=6,  yearEndAction=reset_to_zero
Earned Leave:   quota=0,  yearEndAction=carry_forward_all
Casual Leave:   quota=6,  yearEndAction=reset_to_zero
Unpaid Casual:  quota=0,  isUnlimited=true, isPaid=false, yearEndAction=none
```

### PATCH /api/v1/leave-plans/:planId/leave-types/:typeId — Update

### DELETE /api/v1/leave-plans/:planId/leave-types/:typeId — Remove

---

## 6. Leave Plan Assignment APIs

### POST /api/v1/leave-plan-assignments — Assign plan to employee

Automatically deactivates any prior assignment for the same plan.

**Request:**

```json
{
  "userId": "employee-uuid",
  "leavePlanId": "plan-uuid",
  "effectiveFrom": "2026-01-01",
  "effectiveTo": null
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Leave plan assigned",
  "data": {
    "id": "uuid",
    "userId": "employee-uuid",
    "leavePlanId": "plan-uuid",
    "effectiveFrom": "2026-01-01",
    "effectiveTo": null,
    "assignedBy": "hr-user-uuid",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### GET /api/v1/leave-plan-assignments — List assignments

**Query parameters:** `userId`, `planId` (both optional).

### DELETE /api/v1/leave-plan-assignments/:id — Remove assignment

---

## 7. Leave Balance APIs

### POST /api/v1/leave-balances/initialize?planId=:planId — Initialize balances

Creates `LeaveBalance` records for all employees assigned to the plan, for each active leave type. Skips employees who already have balances.

**Query parameter:** `planId` (required UUID)

**Response (201):**

```json
{
  "success": true,
  "message": "Balances initialized: 12 created, 0 skipped",
  "data": {
    "created": 12,
    "skipped": 0
  }
}
```

### GET /api/v1/leave-balances — Get all balances

**Query parameters:**

| Param  | Type | Required | Description        |
| ------ | ---- | -------- | ------------------ |
| userId | UUID | No       | Filter by employee |
| planId | UUID | No       | Filter by plan     |
| year   | int  | No       | Filter by year     |

**Response (200):**

```json
{
  "success": true,
  "message": "Leave balances retrieved",
  "data": [
    {
      "id": "uuid",
      "userId": "employee-uuid",
      "leaveTypeConfigId": "type-uuid",
      "year": 2026,
      "allocated": "6.0",
      "used": "2.0",
      "carriedForward": "0.0",
      "adjusted": "0.0",
      "balance": "4.0",
      "leaveTypeConfig": {
        "id": "type-uuid",
        "name": "Sick Leave",
        "code": "SL",
        "quota": "6.0",
        "leavePlan": {
          "id": "plan-uuid",
          "name": "Leave Plan 2026"
        }
      },
      "user": {
        "id": "employee-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### GET /api/v1/leave-balances/employee/:userId — Employee balances

**Query parameter:** `year` (optional int)

### POST /api/v1/leave-balances/adjust — Manual adjustment

**Request:**

```json
{
  "leaveBalanceId": "balance-uuid",
  "days": 2.0,
  "remarks": "Extra leave granted for project completion"
}
```

Use negative values to debit: `"days": -1.0`

**Response (200):**

```json
{
  "success": true,
  "message": "Leave balance adjusted",
  "data": {
    "id": "balance-uuid",
    "allocated": "6.0",
    "used": "0.0",
    "carriedForward": "0.0",
    "adjusted": "2.0",
    "balance": "8.0"
  }
}
```

---

## 8. Leave Transaction APIs

### GET /api/v1/leave-balances/transactions — Audit log

**Query parameters:** `userId`, `year` (both optional)

**Response (200):**

```json
{
  "success": true,
  "message": "Leave transactions retrieved",
  "data": [
    {
      "id": "uuid",
      "userId": "employee-uuid",
      "leaveBalanceId": "balance-uuid",
      "leaveId": "leave-uuid-or-null",
      "transactionType": "deduction",
      "days": "-2.0",
      "previousBalance": "6.0",
      "newBalance": "4.0",
      "remarks": "Leave approved - balance deducted",
      "performedBy": "hr-uuid",
      "createdAt": "2026-03-06T..."
    }
  ]
}
```

**transactionType values:** `allocation`, `deduction`, `carry_forward`, `encashment`, `reversal`, `adjustment`

---

## 9. Year-End Processing API

### POST /api/v1/leave-plans/:planId/year-end-processing

Processes carry-forward / reset for all assigned employees based on each leave type's `yearEndAction`, and creates new year balances.

**Request:**

```json
{
  "processingYear": 2026,
  "newYear": 2027
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Year-end processing complete: 48 processed, 48 new balances",
  "data": {
    "processed": 48,
    "newBalancesCreated": 48
  }
}
```

---

## 10. Modified Leave Application API

### POST /api/v1/leaves — Apply for leave (Employee)

Now supports `leaveTypeConfigId` for policy-aware leave applications.

**Request (new format):**

```json
{
  "leaveTypeConfigId": "type-config-uuid",
  "startDate": "2026-03-10",
  "endDate": "2026-03-12",
  "reason": "Family event"
}
```

**Request (legacy format, still supported):**

```json
{
  "leaveType": "sick",
  "startDate": "2026-03-10",
  "endDate": "2026-03-12",
  "reason": "Not feeling well"
}
```

**Validation flow when `leaveTypeConfigId` is provided:**

1. Checks employee has an active leave plan assignment
2. Validates `leaveTypeConfigId` belongs to the assigned plan
3. Calculates working days (excludes weekly offs from shift)
4. Checks sufficient balance (unless leave type is unlimited)
5. Creates leave with `PENDING` status

**Balance deduction happens on approval:**

When HR approves via `PATCH /api/v1/leaves/:id/review`, the balance is automatically deducted and a `deduction` transaction is recorded.

**Balance reversal on cancellation:**

When a previously approved leave is cancelled via `PATCH /api/v1/leaves/:id/cancel`, the balance is automatically restored and a `reversal` transaction is recorded.

**Response (201):**

```json
{
  "success": true,
  "message": "Leave request created",
  "data": {
    "id": "uuid",
    "userId": "employee-uuid",
    "leaveType": null,
    "leaveTypeConfigId": "type-config-uuid",
    "numberOfDays": "2.0",
    "startDate": "2026-03-10",
    "endDate": "2026-03-12",
    "reason": "Family event",
    "status": "pending",
    "reviewedBy": null,
    "reviewNote": null,
    "reviewedAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error responses:**

```json
{ "statusCode": 400, "message": "No active leave plan assigned to you" }
{ "statusCode": 400, "message": "Invalid leave type for your assigned plan" }
{ "statusCode": 400, "message": "Insufficient leave balance. Available: 4, Requested: 5" }
{ "statusCode": 400, "message": "No working days in the selected date range" }
```

---

## 11. Modified Attendance API

The punch-in and punch-out APIs now integrate with shift assignments:

- **Punch-in**: Looks up the employee's active shift assignment, stores the `shiftId` on the attendance record, and checks if the punch-in time is past the shift start time + grace minutes (marks as `LATE`).
- **Punch-out**: Uses the shift's `workHoursPerDay` to determine `PRESENT`, `HALF_DAY`, or `ABSENT` status instead of a hardcoded 9-hour threshold.

**Response shape now includes `shiftId`:**

```json
{
  "success": true,
  "message": "Punch in recorded successfully",
  "data": {
    "workDate": "2026-03-06",
    "punchInAt": "2026-03-06T09:15:00.000Z",
    "punchOutAt": null,
    "totalMinutes": null,
    "status": "present",
    "shiftId": "shift-uuid"
  }
}
```

---

## 12. Admin Page Routing Structure

```
/admin
  /admin/shifts                           — Shift list page
  /admin/shifts/new                       — Create shift form
  /admin/shifts/:id                       — Shift detail / edit page
  /admin/shifts/:id/weekly-offs           — Weekly off configuration
  /admin/shift-assignments                — Shift assignment list
  /admin/shift-assignments/new            — Assign shift to employee

  /admin/leave-plans                      — Leave plan list page
  /admin/leave-plans/new                  — Create leave plan
  /admin/leave-plans/:id                  — Plan detail (with leave types tab)
  /admin/leave-plans/:id/leave-types/new  — Add leave type to plan
  /admin/leave-plans/:id/year-end         — Year-end processing page

  /admin/leave-assignments                — Leave plan assignment list
  /admin/leave-assignments/new            — Assign plan to employee

  /admin/leave-balances                   — All employee balances overview
  /admin/leave-balances/employee/:userId  — Single employee balance detail
  /admin/leave-balances/adjust            — Manual adjustment form
  /admin/leave-balances/transactions      — Transaction audit log
```

All `/admin/*` routes should be wrapped in a route guard that checks `user.role === 'hr'`.

---

## 13. Component Hierarchy

### Shift Management

```
ShiftsPage
├── ShiftListTable
│   ├── ShiftRow (name, code, timing, status, actions)
│   └── EmptyState
├── CreateShiftDialog / CreateShiftPage
│   ├── ShiftBasicInfoForm (name, code, startTime, endTime)
│   ├── ShiftTimingsForm (breakDuration, workHours, flexible, grace)
│   └── WeeklyOffSelector (7-day checkbox grid)
└── ShiftDetailPage
    ├── ShiftInfoCard
    ├── WeeklyOffEditor
    └── ShiftAssignmentsList (employees on this shift)

ShiftAssignmentsPage
├── AssignmentListTable
│   └── AssignmentRow (employee name, shift name, dates, actions)
├── AssignShiftDialog
│   ├── EmployeeSelector (searchable dropdown)
│   ├── ShiftSelector (dropdown)
│   └── DateRangePicker (effectiveFrom, effectiveTo)
└── EmployeeShiftCard (current shift for a specific employee)
```

### Leave Policy Management

```
LeavePlansPage
├── LeavePlanListTable
│   ├── PlanRow (name, year, period, leave types count, actions)
│   └── EmptyState
├── CreateLeavePlanDialog
│   └── PlanForm (name, year, startDate, endDate, description)
└── LeavePlanDetailPage
    ├── PlanInfoCard
    ├── LeaveTypesTab
    │   ├── LeaveTypeListTable
    │   │   └── LeaveTypeRow (name, code, quota, yearEndAction, actions)
    │   └── AddLeaveTypeDialog
    │       ├── LeaveTypeBasicForm (name, code, quota, isUnlimited, isPaid)
    │       └── YearEndSettingsForm (yearEndAction, maxCarryForward, expiry)
    ├── EmployeesTab (assigned employees)
    │   ├── AssignedEmployeesList
    │   └── AssignEmployeeDialog
    └── YearEndProcessingTab
        ├── ProcessingYearSelector
        └── ProcessButton (with confirmation dialog)

LeaveBalancesPage
├── BalanceFilters (employee, plan, year selectors)
├── BalanceOverviewTable
│   └── BalanceRow (employee, leave type, allocated, used, balance)
├── EmployeeBalanceDetailPage
│   ├── BalanceSummaryCards (per leave type)
│   └── TransactionHistory
└── AdjustBalanceDialog
    ├── BalanceSelector
    ├── DaysInput (+/- number)
    └── RemarksInput
```

---

## 14. Form Validation Rules

### Shift Form

| Field                | Rules                                 |
| -------------------- | ------------------------------------- |
| name                 | Required, 2-255 chars                 |
| code                 | Required, 2-50 chars, unique          |
| startTime            | Required, HH:mm format                |
| endTime              | Required, HH:mm format                |
| breakDurationMinutes | Optional, integer 0-480               |
| workHoursPerDay      | Required, number 1-24, max 2 decimals |
| isFlexible           | Optional boolean                      |
| graceMinutes         | Optional, integer 0-120               |
| isDefault            | Optional boolean                      |

### Weekly Off

| Field            | Rules                                      |
| ---------------- | ------------------------------------------ |
| dayOfWeek        | Required, integer 0-6                      |
| isFullDay        | Optional boolean (default true)            |
| weeklyOffs array | Max 7 items, no duplicate dayOfWeek values |

### Leave Plan Form

| Field       | Rules                                         |
| ----------- | --------------------------------------------- |
| name        | Required, 2-255 chars                         |
| year        | Required, integer 2020-2100                   |
| startDate   | Required, YYYY-MM-DD                          |
| endDate     | Required, YYYY-MM-DD, must be after startDate |
| description | Optional string                               |

### Leave Type Config Form

| Field                  | Rules                                                    |
| ---------------------- | -------------------------------------------------------- |
| name                   | Required, 2-255 chars                                    |
| code                   | Required, 1-50 chars, unique within plan                 |
| quota                  | Required, number 0-365, max 1 decimal                    |
| isUnlimited            | Optional boolean                                         |
| isPaid                 | Optional boolean (default true)                          |
| yearEndAction          | Optional enum (default `reset_to_zero`)                  |
| maxCarryForward        | Optional number >= 0 (only when `carry_forward_limited`) |
| carryForwardExpiryDays | Optional integer >= 1                                    |
| isEncashable           | Optional boolean                                         |

### Shift Assignment Form

| Field         | Rules                                            |
| ------------- | ------------------------------------------------ |
| userId        | Required UUID                                    |
| shiftId       | Required UUID                                    |
| effectiveFrom | Required YYYY-MM-DD                              |
| effectiveTo   | Optional YYYY-MM-DD, must be after effectiveFrom |

### Leave Plan Assignment Form

| Field         | Rules                                            |
| ------------- | ------------------------------------------------ |
| userId        | Required UUID                                    |
| leavePlanId   | Required UUID                                    |
| effectiveFrom | Required YYYY-MM-DD                              |
| effectiveTo   | Optional YYYY-MM-DD, must be after effectiveFrom |

### Balance Adjustment Form

| Field          | Rules                          |
| -------------- | ------------------------------ |
| leaveBalanceId | Required UUID                  |
| days           | Required number, max 1 decimal |
| remarks        | Optional string                |

---

## 15. Error Handling Patterns

All API errors follow this shape:

```json
{
  "statusCode": 400,
  "message": "Human-readable error message",
  "error": "Bad Request"
}
```

### Common HTTP status codes

| Code | Meaning                        | Frontend Action                  |
| ---- | ------------------------------ | -------------------------------- |
| 400  | Validation error / bad request | Show inline form errors or toast |
| 401  | Unauthorized (token expired)   | Redirect to login                |
| 403  | Forbidden (not HR role)        | Show access denied page          |
| 404  | Resource not found             | Show not found state             |
| 409  | Conflict (duplicate code)      | Show field-specific error        |

### Recommended error handling:

```typescript
try {
  const response = await api.post('/api/v1/shifts', shiftData);
  toast.success(response.data.message);
} catch (error) {
  if (error.response?.status === 401) {
    router.push('/login');
  } else if (error.response?.status === 403) {
    toast.error('You do not have permission for this action');
  } else if (error.response?.status === 409) {
    setFieldError('code', error.response.data.message);
  } else {
    toast.error(error.response?.data?.message ?? 'An error occurred');
  }
}
```

---

## 16. State Management Approach

### Recommended API layer structure

```
src/
  api/
    shifts.api.ts        — Shift CRUD + weekly offs
    shiftAssignments.api.ts
    leavePlans.api.ts    — Plan CRUD + leave types
    leavePlanAssignments.api.ts
    leaveBalances.api.ts — Balances + adjustments + transactions
```

### API client example (using axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const shiftsApi = {
  list: () => api.get('/api/v1/shifts'),
  get: (id: string) => api.get(`/api/v1/shifts/${id}`),
  create: (data: CreateShiftDto) => api.post('/api/v1/shifts', data),
  update: (id: string, data: Partial<CreateShiftDto>) =>
    api.patch(`/api/v1/shifts/${id}`, data),
  deactivate: (id: string) => api.delete(`/api/v1/shifts/${id}`),
  setWeeklyOffs: (id: string, data: SetWeeklyOffsDto) =>
    api.put(`/api/v1/shifts/${id}/weekly-offs`, data),
};

export const leavePlansApi = {
  list: () => api.get('/api/v1/leave-plans'),
  get: (id: string) => api.get(`/api/v1/leave-plans/${id}`),
  create: (data: CreateLeavePlanDto) => api.post('/api/v1/leave-plans', data),
  update: (id: string, data: Partial<CreateLeavePlanDto>) =>
    api.patch(`/api/v1/leave-plans/${id}`, data),
  deactivate: (id: string) => api.delete(`/api/v1/leave-plans/${id}`),
  addLeaveType: (planId: string, data: CreateLeaveTypeConfigDto) =>
    api.post(`/api/v1/leave-plans/${planId}/leave-types`, data),
  updateLeaveType: (
    planId: string,
    typeId: string,
    data: Partial<CreateLeaveTypeConfigDto>
  ) => api.patch(`/api/v1/leave-plans/${planId}/leave-types/${typeId}`, data),
  removeLeaveType: (planId: string, typeId: string) =>
    api.delete(`/api/v1/leave-plans/${planId}/leave-types/${typeId}`),
  yearEndProcessing: (planId: string, data: YearEndProcessingDto) =>
    api.post(`/api/v1/leave-plans/${planId}/year-end-processing`, data),
};

export const leaveBalancesApi = {
  initialize: (planId: string) =>
    api.post(`/api/v1/leave-balances/initialize?planId=${planId}`),
  list: (params?: { userId?: string; planId?: string; year?: number }) =>
    api.get('/api/v1/leave-balances', { params }),
  getByEmployee: (userId: string, year?: number) =>
    api.get(`/api/v1/leave-balances/employee/${userId}`, {
      params: year ? { year } : undefined,
    }),
  adjust: (data: AdjustLeaveBalanceDto) =>
    api.post('/api/v1/leave-balances/adjust', data),
  getTransactions: (params?: { userId?: string; year?: number }) =>
    api.get('/api/v1/leave-balances/transactions', { params }),
};
```

### With React Query / TanStack Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useShifts() {
  return useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list().then(r => r.data.data),
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: shiftsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useLeaveBalances(params?: {
  userId?: string;
  planId?: string;
  year?: number;
}) {
  return useQuery({
    queryKey: ['leave-balances', params],
    queryFn: () => leaveBalancesApi.list(params).then(r => r.data.data),
  });
}
```

### TypeScript interfaces for frontend

```typescript
interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  workHoursPerDay: number;
  isFlexible: boolean;
  graceMinutes: number;
  isDefault: boolean;
  isActive: boolean;
  weeklyOffs: ShiftWeeklyOff[];
  createdAt: string;
  updatedAt: string;
}

interface ShiftWeeklyOff {
  id: string;
  shiftId: string;
  dayOfWeek: number;
  isFullDay: boolean;
  createdAt: string;
}

interface ShiftAssignment {
  id: string;
  userId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  assignedBy: string;
  isActive: boolean;
  user?: User;
  shift?: Shift;
  createdAt: string;
  updatedAt: string;
}

interface LeavePlan {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  description: string | null;
  isActive: boolean;
  leaveTypeConfigs?: LeaveTypeConfig[];
  createdAt: string;
  updatedAt: string;
}

interface LeaveTypeConfig {
  id: string;
  leavePlanId: string;
  name: string;
  code: string;
  quota: number;
  isUnlimited: boolean;
  isPaid: boolean;
  yearEndAction:
    | 'reset_to_zero'
    | 'carry_forward_all'
    | 'carry_forward_limited'
    | 'none';
  maxCarryForward: number | null;
  carryForwardExpiryDays: number | null;
  isEncashable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LeavePlanAssignment {
  id: string;
  userId: string;
  leavePlanId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  assignedBy: string;
  isActive: boolean;
  user?: User;
  leavePlan?: LeavePlan;
  createdAt: string;
  updatedAt: string;
}

interface LeaveBalance {
  id: string;
  userId: string;
  leaveTypeConfigId: string;
  year: number;
  allocated: number;
  used: number;
  carriedForward: number;
  adjusted: number;
  balance: number;
  leaveTypeConfig?: LeaveTypeConfig;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

interface LeaveTransaction {
  id: string;
  userId: string;
  leaveBalanceId: string;
  leaveId: string | null;
  transactionType:
    | 'allocation'
    | 'deduction'
    | 'carry_forward'
    | 'encashment'
    | 'reversal'
    | 'adjustment';
  days: number;
  previousBalance: number;
  newBalance: number;
  remarks: string | null;
  performedBy: string;
  createdAt: string;
}
```

---

## Typical Admin Workflow

1. **Create a Shift** → Set weekly offs → Mark as default if needed
2. **Create a Leave Plan** for the year → Add leave types (Sick, Casual, Earned, Unpaid)
3. **Onboard an employee** → Assign shift → Assign leave plan
4. **Initialize balances** for the plan (allocates quota to all assigned employees)
5. **Employee applies leave** → System validates balance → HR approves → Balance auto-deducted
6. **Year-end** → HR runs year-end processing → Carry forward / reset balances → New year balances created
