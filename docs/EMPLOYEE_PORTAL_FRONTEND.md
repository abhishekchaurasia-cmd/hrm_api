# Employee Portal - Frontend Integration Guide

## Overview

This document covers the **Employee Portal** features for logged-in employees: **Profile**, **Leave Management** (view balances, apply, cancel), and **Attendance** (punch in/out, history, summary). All features follow a Keka-style UI/UX pattern.

All endpoints require employee authentication (`Authorization: Bearer <jwt>`). Unless noted otherwise, endpoints are accessible to both `employee` and `hr` roles.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication Context](#authentication-context)
3. [Profile Section](#profile-section)
   - [Get My Profile](#get-my-profile)
   - [Update My Profile](#update-my-profile)
   - [Profile Data Structure](#profile-data-structure)
4. [Leave Management](#leave-management)
   - [Dashboard Leave Widget](#dashboard-leave-widget)
   - [Get My Leave Balances](#get-my-leave-balances)
   - [Get Available Leave Types](#get-available-leave-types)
   - [Apply for Leave](#apply-for-leave)
   - [Get My Leave Requests](#get-my-leave-requests)
   - [Cancel Leave Request](#cancel-leave-request)
5. [Attendance](#attendance)
   - [Dashboard Attendance Widget](#dashboard-attendance-widget)
   - [Punch In](#punch-in)
   - [Punch Out](#punch-out)
   - [Get Today's Attendance](#get-todays-attendance)
   - [Get Attendance History](#get-attendance-history)
   - [Get Attendance Summary](#get-attendance-summary)
6. [Frontend Routing](#frontend-routing)
7. [Component Hierarchy](#component-hierarchy)
8. [State Management](#state-management)
9. [Error Handling](#error-handling)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Employee Portal                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │  Dashboard   │  │   Leave     │  │   Attendance     │    │
│  │             │  │             │  │                  │    │
│  │ - Attendance │  │ - Balances  │  │ - Punch In/Out   │    │
│  │   Widget    │  │ - Apply     │  │ - History Log    │    │
│  │ - Leave     │  │ - My Leaves │  │ - Monthly Summary│    │
│  │   Widget    │  │ - Cancel    │  │                  │    │
│  └─────────────┘  └─────────────┘  └──────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Profile                             │   │
│  │  - Basic Details    - Job Details                     │   │
│  │  - Compensation     - Shift & Leave Plan              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Authentication Context

After login, the session token provides access to the employee's data. All API calls use the JWT from the `Authorization` header. The backend automatically scopes responses to the authenticated user for `/me` endpoints.

```
Authorization: Bearer <access_token>
```

---

## Profile Section

### Get My Profile

Retrieves the current employee's complete profile including related data (compensation, shift, leave plan).

| Method | Endpoint                       | Auth                   |
| ------ | ------------------------------ | ---------------------- |
| GET    | `/api/v1/employee-profiles/me` | Any authenticated user |

**Response:**

```json
{
  "success": true,
  "message": "Employee profile retrieved",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "employee",
      "department": {
        "id": "uuid",
        "name": "Engineering"
      }
    },
    "middleName": null,
    "displayName": "John Doe",
    "gender": "male",
    "dateOfBirth": "1995-06-15",
    "nationality": "Indian",
    "workCountry": "India",
    "employeeNumber": "EMP-001",
    "numberSeries": "EMP",
    "mobileNumber": "+919876543210",
    "joiningDate": "2025-01-15",
    "jobTitle": "Software Engineer",
    "secondaryJobTitle": null,
    "timeType": "full_time",
    "workerType": "permanent",
    "reportingManager": {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    },
    "dottedLineManager": null,
    "legalEntity": {
      "id": "uuid",
      "name": "Acme Corp India"
    },
    "businessUnit": {
      "id": "uuid",
      "name": "Product Engineering"
    },
    "location": {
      "id": "uuid",
      "name": "Bangalore Office"
    },
    "probationPolicyMonths": 6,
    "noticePeriodDays": 90,
    "holidayList": {
      "id": "uuid",
      "name": "India 2026 Holidays"
    },
    "attendanceNumber": "ATT-001",
    "compensation": {
      "id": "uuid",
      "annualSalary": 1200000,
      "currency": "INR",
      "salaryEffectiveFrom": "2025-01-15",
      "regularSalary": 1000000,
      "bonus": 200000,
      "isEsiEligible": false,
      "taxRegime": "new_regime",
      "breakups": [
        {
          "id": "uuid",
          "salaryComponent": {
            "id": "uuid",
            "name": "Basic Salary",
            "code": "BASIC"
          },
          "annualAmount": 480000,
          "monthlyAmount": 40000
        }
      ]
    },
    "shiftAssignment": {
      "id": "uuid",
      "shiftId": "uuid",
      "effectiveFrom": "2025-01-15",
      "shift": {
        "id": "uuid",
        "name": "General Shift",
        "code": "GEN",
        "startTime": "09:00:00",
        "endTime": "18:00:00",
        "workHoursPerDay": 9,
        "graceMinutes": 15,
        "weeklyOffs": [{ "dayOfWeek": 0 }, { "dayOfWeek": 6 }]
      }
    },
    "leavePlanAssignment": {
      "id": "uuid",
      "leavePlanId": "uuid",
      "effectiveFrom": "2025-01-15",
      "leavePlan": {
        "id": "uuid",
        "name": "Standard Leave Plan 2026",
        "year": 2026
      }
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2026-03-10T08:30:00.000Z"
  }
}
```

### Update My Profile

Employees can update limited fields on their own profile. HR can update all fields.

| Method | Endpoint                       | Auth                   |
| ------ | ------------------------------ | ---------------------- |
| PATCH  | `/api/v1/employee-profiles/me` | Any authenticated user |

**Employee-editable fields:**

- `middleName`, `displayName`, `mobileNumber`
- `dateOfBirth`, `nationality`, `workCountry`
- `gender`

**Request:**

```json
{
  "mobileNumber": "+919876543211",
  "displayName": "Johnny Doe"
}
```

**Response:** Same structure as Get My Profile.

### Profile Data Structure

| Section      | Fields                                                                               | Editable by Employee |
| ------------ | ------------------------------------------------------------------------------------ | -------------------- |
| Basic Info   | firstName, lastName, email (from user)                                               | No (read-only)       |
| Personal     | middleName, displayName, gender, dateOfBirth, nationality, workCountry, mobileNumber | Yes                  |
| Employee ID  | employeeNumber, numberSeries, attendanceNumber                                       | No                   |
| Job Info     | joiningDate, jobTitle, secondaryJobTitle, timeType, workerType                       | No                   |
| Organization | department, legalEntity, businessUnit, location                                      | No                   |
| Managers     | reportingManager, dottedLineManager                                                  | No                   |
| Policies     | probationPolicyMonths, noticePeriodDays, holidayList                                 | No                   |
| Compensation | annualSalary, breakups, taxRegime                                                    | No (view only)       |
| Shift        | shift name, timing, weekly offs                                                      | No (view only)       |
| Leave Plan   | plan name, year                                                                      | No (view only)       |

---

## Leave Management

### Dashboard Leave Widget

The dashboard should show a summary card with total leaves, used, and balance for the current year. Fetch this data using the leave balances endpoint.

**Data flow:**

```
Dashboard Load
    │
    ├── GET /api/v1/leave-balances/me?year=2026
    │   └── Returns all leave type balances
    │
    └── Compute totals:
        totalLeaves = sum(allocated)
        used = sum(used)
        balance = sum(balance)
        carriedForward = sum(carriedForward)
```

### Get My Leave Balances

Returns the employee's leave balances for a given year.

| Method | Endpoint                    | Auth                   |
| ------ | --------------------------- | ---------------------- |
| GET    | `/api/v1/leave-balances/me` | Any authenticated user |

**Query Parameters:**

| Param  | Type   | Required | Default      | Description                |
| ------ | ------ | -------- | ------------ | -------------------------- |
| `year` | number | No       | Current year | Year to fetch balances for |

**Request:**

```
GET /api/v1/leave-balances/me?year=2026
```

**Response:**

```json
{
  "success": true,
  "message": "Employee leave balances retrieved",
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "leaveTypeConfigId": "uuid",
      "year": 2026,
      "allocated": 18,
      "used": 3,
      "carriedForward": 2,
      "adjusted": 0,
      "balance": 17,
      "leaveTypeConfig": {
        "id": "uuid",
        "name": "Casual Leave",
        "code": "CL",
        "quota": 18,
        "isUnlimited": false,
        "isPaid": true
      }
    },
    {
      "id": "uuid",
      "userId": "uuid",
      "leaveTypeConfigId": "uuid",
      "year": 2026,
      "allocated": 12,
      "used": 0,
      "carriedForward": 0,
      "adjusted": 0,
      "balance": 12,
      "leaveTypeConfig": {
        "id": "uuid",
        "name": "Sick Leave",
        "code": "SL",
        "quota": 12,
        "isUnlimited": false,
        "isPaid": true
      }
    }
  ]
}
```

**Dashboard Widget Computation:**

```typescript
const balances = response.data;
const totalLeaves = balances.reduce((sum, b) => sum + b.allocated, 0);
const used = balances.reduce((sum, b) => sum + b.used, 0);
const balance = balances.reduce((sum, b) => sum + b.balance, 0);
const carriedForward = balances.reduce((sum, b) => sum + b.carriedForward, 0);
```

### Get Available Leave Types

Returns the employee's assigned leave plan with all active leave types and their current balances. Use this to populate the "Leave Type" dropdown in the Apply Leave form.

| Method | Endpoint                            | Auth                   |
| ------ | ----------------------------------- | ---------------------- |
| GET    | `/api/v1/leaves/me/available-types` | Any authenticated user |

**Response:**

```json
{
  "success": true,
  "message": "Available leave types retrieved",
  "data": {
    "planName": "Standard Leave Plan 2026",
    "planId": "uuid",
    "year": 2026,
    "leaveTypes": [
      {
        "id": "uuid",
        "name": "Casual Leave",
        "code": "CL",
        "quota": 18,
        "isUnlimited": false,
        "isPaid": true,
        "balance": 17,
        "used": 3,
        "allocated": 18,
        "carriedForward": 2
      },
      {
        "id": "uuid",
        "name": "Sick Leave",
        "code": "SL",
        "quota": 12,
        "isUnlimited": false,
        "isPaid": true,
        "balance": 12,
        "used": 0,
        "allocated": 12,
        "carriedForward": 0
      },
      {
        "id": "uuid",
        "name": "Work From Home",
        "code": "WFH",
        "quota": null,
        "isUnlimited": true,
        "isPaid": true,
        "balance": 0,
        "used": 0,
        "allocated": 0,
        "carriedForward": 0
      }
    ]
  }
}
```

**No leave plan assigned response:**

```json
{
  "success": true,
  "message": "No active leave plan assigned",
  "data": {
    "planName": null,
    "leaveTypes": []
  }
}
```

### Apply for Leave

Submit a leave request. The backend validates the date range, calculates working days (excluding weekly offs from the employee's shift), checks leave balance, and creates a `PENDING` leave request.

| Method | Endpoint         | Auth                   |
| ------ | ---------------- | ---------------------- |
| POST   | `/api/v1/leaves` | Any authenticated user |

**Request:**

```json
{
  "leaveTypeConfigId": "uuid-of-leave-type",
  "startDate": "2026-03-15",
  "endDate": "2026-03-17",
  "reason": "Family function"
}
```

| Field               | Type   | Required        | Description                                                                   |
| ------------------- | ------ | --------------- | ----------------------------------------------------------------------------- |
| `leaveTypeConfigId` | UUID   | Yes (preferred) | Leave type ID from `available-types` endpoint                                 |
| `leaveType`         | enum   | Alternative     | Legacy enum: `annual`, `sick`, `personal`, `maternity`, `paternity`, `unpaid` |
| `startDate`         | string | Yes             | Start date (`YYYY-MM-DD`)                                                     |
| `endDate`           | string | Yes             | End date (`YYYY-MM-DD`), same as startDate for single day                     |
| `reason`            | string | No              | Reason for leave                                                              |

**Response (201):**

```json
{
  "success": true,
  "message": "Leave request created",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "leaveType": null,
    "leaveTypeConfigId": "uuid",
    "startDate": "2026-03-15",
    "endDate": "2026-03-17",
    "numberOfDays": 2,
    "reason": "Family function",
    "status": "pending",
    "reviewedBy": null,
    "reviewNote": null,
    "reviewedAt": null,
    "createdAt": "2026-03-10T10:30:00.000Z",
    "updatedAt": "2026-03-10T10:30:00.000Z"
  }
}
```

**Validation errors (400):**

| Error                                                    | When                                     |
| -------------------------------------------------------- | ---------------------------------------- |
| `Either leaveType or leaveTypeConfigId is required`      | Neither field provided                   |
| `End date must be after start date`                      | endDate < startDate                      |
| `No working days in the selected date range`             | All selected days are weekly offs        |
| `No active leave plan assigned to you`                   | Employee has no leave plan               |
| `Invalid leave type for your assigned plan`              | leaveTypeConfigId not in employee's plan |
| `Insufficient leave balance. Available: X, Requested: Y` | Not enough balance                       |

**Apply Leave Flow (Keka-style):**

```
1. User clicks "Apply New Leave"
     │
2. GET /api/v1/leaves/me/available-types
     │ → Populate leave type dropdown
     │ → Show balance next to each type
     │
3. User selects leave type, picks dates, enters reason
     │
4. Frontend calculates approximate days (for preview)
     │
5. POST /api/v1/leaves
     │ → Backend calculates exact working days
     │ → Validates balance
     │ → Creates pending request
     │
6. Show success → Redirect to My Leaves
```

### Get My Leave Requests

Returns all leave requests for the current user, sorted by most recent first.

| Method | Endpoint            | Auth                   |
| ------ | ------------------- | ---------------------- |
| GET    | `/api/v1/leaves/me` | Any authenticated user |

**Response:**

```json
{
  "success": true,
  "message": "Leave requests retrieved",
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "leaveType": null,
      "leaveTypeConfigId": "uuid",
      "leaveTypeConfig": {
        "id": "uuid",
        "name": "Casual Leave",
        "code": "CL"
      },
      "startDate": "2026-03-15",
      "endDate": "2026-03-17",
      "numberOfDays": 2,
      "reason": "Family function",
      "status": "pending",
      "reviewedBy": null,
      "reviewNote": null,
      "reviewedAt": null,
      "createdAt": "2026-03-10T10:30:00.000Z",
      "updatedAt": "2026-03-10T10:30:00.000Z"
    },
    {
      "id": "uuid",
      "userId": "uuid",
      "leaveType": null,
      "leaveTypeConfigId": "uuid",
      "leaveTypeConfig": {
        "id": "uuid",
        "name": "Sick Leave",
        "code": "SL"
      },
      "startDate": "2026-02-10",
      "endDate": "2026-02-10",
      "numberOfDays": 1,
      "reason": "Unwell",
      "status": "approved",
      "reviewedBy": "uuid",
      "reviewNote": "Approved",
      "reviewedAt": "2026-02-10T14:00:00.000Z",
      "createdAt": "2026-02-10T08:00:00.000Z",
      "updatedAt": "2026-02-10T14:00:00.000Z"
    }
  ]
}
```

**Leave Status Values:**

| Status      | Description           | UI Color Suggestion |
| ----------- | --------------------- | ------------------- |
| `pending`   | Awaiting HR review    | Orange/Yellow       |
| `approved`  | Approved by HR        | Green               |
| `rejected`  | Rejected by HR        | Red                 |
| `cancelled` | Cancelled by employee | Gray                |

### Cancel Leave Request

Cancel a pending or approved leave request. If the leave was already approved, the balance is automatically restored.

| Method | Endpoint                    | Auth       |
| ------ | --------------------------- | ---------- |
| PATCH  | `/api/v1/leaves/:id/cancel` | Owner only |

**Response:**

```json
{
  "success": true,
  "message": "Leave request cancelled",
  "data": {
    "id": "uuid",
    "status": "cancelled"
  }
}
```

**Rules:**

- Only `pending` or `approved` leaves can be cancelled
- Only the leave owner can cancel their own leave
- If an approved leave is cancelled, the balance is automatically reversed

---

## Attendance

### Dashboard Attendance Widget

The dashboard should show:

- Current date/time
- Punch In/Out button (toggle based on state)
- Total hours timer (live when punched in)
- Today's status

**Data flow on dashboard load:**

```
Dashboard Load
    │
    GET /api/v1/attendance/me/today
    │
    ├── punchInAt is null → Show "Punch In" button
    │
    ├── punchInAt exists, punchOutAt is null → Show "Punch Out" button
    │   └── Start live timer from punchInAt
    │
    └── punchOutAt exists → Show completed state
        └── Display totalMinutes as "Xh Ym"
```

### Punch In

Records the employee's punch-in time for today. Detects late arrival based on the assigned shift.

| Method | Endpoint                      | Auth                   |
| ------ | ----------------------------- | ---------------------- |
| POST   | `/api/v1/attendance/punch-in` | Any authenticated user |

**Request:** No body required.

**Response (201):**

```json
{
  "success": true,
  "message": "Punch in recorded successfully",
  "data": {
    "workDate": "2026-03-10",
    "punchInAt": "2026-03-10T03:31:00.000Z",
    "punchOutAt": null,
    "totalMinutes": null,
    "status": "present",
    "shiftId": "uuid"
  }
}
```

**Status on punch-in:**

- `present` — punched in within grace period
- `late` — punched in after shift start + grace minutes

**Errors (400):**

- `You have already punched in for today` — already punched in, no punch out yet
- `You have already completed attendance for today` — already punched in and out

### Punch Out

Records the employee's punch-out time and calculates total hours worked.

| Method | Endpoint                       | Auth                   |
| ------ | ------------------------------ | ---------------------- |
| POST   | `/api/v1/attendance/punch-out` | Any authenticated user |

**Request:** No body required.

**Response (201):**

```json
{
  "success": true,
  "message": "Punch out recorded successfully",
  "data": {
    "workDate": "2026-03-10",
    "punchInAt": "2026-03-10T03:31:00.000Z",
    "punchOutAt": "2026-03-10T12:35:00.000Z",
    "totalMinutes": 544,
    "status": "present",
    "shiftId": "uuid"
  }
}
```

**Status determination on punch-out:**

| Condition                                   | Status     |
| ------------------------------------------- | ---------- |
| totalMinutes >= required hours AND not late | `present`  |
| totalMinutes >= required hours AND was late | `late`     |
| totalMinutes >= required hours / 2          | `half_day` |
| totalMinutes < required hours / 2           | `absent`   |

Required hours = shift's `workHoursPerDay` (default: 9 hours if no shift assigned).

**Errors (400):**

- `Punch in is required before punch out`
- `You have already punched out for today`

### Get Today's Attendance

Returns today's attendance record for the current user.

| Method | Endpoint                      | Auth                   |
| ------ | ----------------------------- | ---------------------- |
| GET    | `/api/v1/attendance/me/today` | Any authenticated user |

**Response (no attendance yet):**

```json
{
  "success": true,
  "message": "Today attendance retrieved",
  "data": {
    "workDate": "2026-03-10",
    "punchInAt": null,
    "punchOutAt": null,
    "totalMinutes": null,
    "status": null,
    "shiftId": null
  }
}
```

### Get Attendance History

Returns paginated attendance records for a given month/year.

| Method | Endpoint                        | Auth                   |
| ------ | ------------------------------- | ---------------------- |
| GET    | `/api/v1/attendance/me/history` | Any authenticated user |

**Query Parameters:**

| Param   | Type   | Required | Default       | Description    |
| ------- | ------ | -------- | ------------- | -------------- |
| `month` | number | No       | Current month | Month (1-12)   |
| `year`  | number | No       | Current year  | Year           |
| `page`  | number | No       | 1             | Page number    |
| `limit` | number | No       | 31            | Items per page |

**Request:**

```
GET /api/v1/attendance/me/history?month=3&year=2026
```

**Response:**

```json
{
  "success": true,
  "message": "Attendance history retrieved",
  "data": {
    "records": [
      {
        "id": "uuid",
        "userId": "uuid",
        "shiftId": "uuid",
        "shift": {
          "id": "uuid",
          "name": "General Shift",
          "startTime": "09:00:00",
          "endTime": "18:00:00",
          "workHoursPerDay": 9
        },
        "workDate": "2026-03-10",
        "punchInAt": "2026-03-10T03:31:00.000Z",
        "punchOutAt": "2026-03-10T12:35:00.000Z",
        "totalMinutes": 544,
        "status": "present",
        "createdAt": "2026-03-10T03:31:00.000Z",
        "updatedAt": "2026-03-10T12:35:00.000Z"
      },
      {
        "id": "uuid",
        "userId": "uuid",
        "shiftId": "uuid",
        "shift": {
          "id": "uuid",
          "name": "General Shift",
          "startTime": "09:00:00",
          "endTime": "18:00:00",
          "workHoursPerDay": 9
        },
        "workDate": "2026-03-09",
        "punchInAt": "2026-03-09T03:45:00.000Z",
        "punchOutAt": "2026-03-09T12:50:00.000Z",
        "totalMinutes": 545,
        "status": "present",
        "createdAt": "2026-03-09T03:45:00.000Z",
        "updatedAt": "2026-03-09T12:50:00.000Z"
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 31,
    "totalPages": 1
  }
}
```

**Rendering the attendance log table:**

| Date        | Day | Punch In | Punch Out | Working Hours | Status  |
| ----------- | --- | -------- | --------- | ------------- | ------- |
| 10 Mar 2026 | Tue | 09:01 AM | 06:05 PM  | 9h 04m        | Present |
| 09 Mar 2026 | Mon | 09:15 AM | 06:20 PM  | 9h 05m        | Present |

**Time formatting helper:**

```typescript
function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}
```

### Get Attendance Summary

Returns aggregated attendance statistics for a given month.

| Method | Endpoint                        | Auth                   |
| ------ | ------------------------------- | ---------------------- |
| GET    | `/api/v1/attendance/me/summary` | Any authenticated user |

**Query Parameters:**

| Param   | Type   | Required | Default       | Description  |
| ------- | ------ | -------- | ------------- | ------------ |
| `month` | number | No       | Current month | Month (1-12) |
| `year`  | number | No       | Current year  | Year         |

**Request:**

```
GET /api/v1/attendance/me/summary?month=3&year=2026
```

**Response:**

```json
{
  "success": true,
  "message": "Attendance summary retrieved",
  "data": {
    "month": 3,
    "year": 2026,
    "totalDays": 8,
    "present": 6,
    "late": 1,
    "halfDay": 1,
    "absent": 0,
    "totalWorkedMinutes": 4320,
    "expectedMinutesPerDay": 540,
    "averageWorkedMinutes": 540
  }
}
```

**Dashboard rendering:**

```
┌──────────────────────────────────────────────────┐
│  Working Hours     Expected      Overtime        │
│  ● 72h 00m        ● 72h 00m     ● 0h 00m       │
│                                                  │
│  Total Hours Today: 9.0 / 9                     │
│  ↑ 100% of expected                             │
└──────────────────────────────────────────────────┘
```

**Computation helpers:**

```typescript
const summary = response.data;

const totalWorkedHours = formatMinutes(summary.totalWorkedMinutes);
const expectedHours = formatMinutes(
  summary.expectedMinutesPerDay * summary.totalDays
);
const overtime = Math.max(
  0,
  summary.totalWorkedMinutes - summary.expectedMinutesPerDay * summary.totalDays
);
const overtimeFormatted = formatMinutes(overtime);
const percentOfExpected =
  summary.totalDays > 0
    ? Math.round(
        (summary.totalWorkedMinutes /
          (summary.expectedMinutesPerDay * summary.totalDays)) *
          100
      )
    : 0;
```

---

## Frontend Routing

```
/dashboard              → Dashboard (attendance widget + leave widget)
/attendance             → Attendance page (history log + summary)
/leave                  → Leave page (balances + my leaves list)
/leave/apply            → Apply for leave form
/profile                → Profile page (all sections)
```

---

## Component Hierarchy

### Dashboard Page

```
DashboardPage
├── AttendanceWidget
│   ├── ClockDisplay (current time)
│   ├── TimerCircle (total hours, animated)
│   ├── PunchButton (Punch In / Punch Out)
│   └── StatusBadge (present/late)
├── LeaveDetailsWidget
│   ├── YearSelector (dropdown)
│   ├── LeaveStats (total, used, balance, carried forward)
│   └── ApplyLeaveButton → navigates to /leave/apply
├── TodayHoursCard
│   ├── HoursBar (X.X / 9)
│   └── PercentageLabel
└── WorkingHoursSummary
    ├── WorkingHoursDisplay
    ├── ExpectedHoursDisplay
    └── OvertimeDisplay
```

### Leave Page

```
LeavePage
├── LeaveBalanceCards
│   └── (one card per leave type: name, allocated, used, balance)
├── ApplyLeaveButton → /leave/apply
└── MyLeavesTable
    ├── LeaveRow
    │   ├── LeaveTypeBadge (CL, SL, etc.)
    │   ├── DateRange
    │   ├── DaysCount
    │   ├── StatusBadge (pending/approved/rejected/cancelled)
    │   └── CancelButton (if pending or approved)
    └── EmptyState ("No leave requests yet")
```

### Apply Leave Page

```
ApplyLeavePage
├── LeaveTypeSelect (dropdown from available-types)
│   └── Show balance next to each option: "Casual Leave (17 remaining)"
├── DateRangePicker (start date, end date)
├── DaysPreview ("2 working days")
├── ReasonTextarea
└── SubmitButton
```

### Attendance Page

```
AttendancePage
├── MonthYearSelector
├── AttendanceSummaryCards
│   ├── PresentCount (green)
│   ├── LateCount (orange)
│   ├── HalfDayCount (yellow)
│   ├── AbsentCount (red)
│   └── TotalHours
└── AttendanceHistoryTable
    ├── AttendanceRow
    │   ├── Date
    │   ├── DayName
    │   ├── PunchInTime
    │   ├── PunchOutTime
    │   ├── WorkingHours
    │   └── StatusBadge
    └── Pagination
```

### Profile Page

```
ProfilePage
├── ProfileHeader (avatar, name, employee number, job title)
├── BasicDetailsSection (read-only + editable fields)
├── JobDetailsSection (read-only)
├── OrganizationSection (read-only)
├── CompensationSection (read-only, salary breakup table)
├── ShiftSection (read-only, shift timing, weekly offs)
└── LeavePlanSection (read-only, plan name, year)
```

---

## State Management

### Recommended Data Fetching Pattern (React/Next.js)

```typescript
// hooks/useLeaveBalances.ts
import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(res => res.json());

export function useLeaveBalances(year: number) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/leave-balances/me?year=${year}`,
    fetcher
  );

  return {
    balances: data?.data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
```

```typescript
// hooks/useAttendance.ts
export function useAttendanceHistory(month: number, year: number) {
  const { data, error, isLoading } = useSWR(
    `/api/v1/attendance/me/history?month=${month}&year=${year}`,
    fetcher
  );

  return {
    records: data?.data?.records ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    isError: !!error,
  };
}

export function useAttendanceSummary(month: number, year: number) {
  const { data, error, isLoading } = useSWR(
    `/api/v1/attendance/me/summary?month=${month}&year=${year}`,
    fetcher
  );

  return {
    summary: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}
```

```typescript
// hooks/useTodayAttendance.ts
export function useTodayAttendance() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/v1/attendance/me/today',
    fetcher,
    { refreshInterval: 60000 } // poll every minute for live timer
  );

  return {
    attendance: data?.data ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
```

### Apply Leave Action

```typescript
async function applyLeave(payload: {
  leaveTypeConfigId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  const response = await fetch('/api/v1/leaves', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to apply leave');
  }

  return data;
}
```

### Punch In/Out Action

```typescript
async function punchIn() {
  const response = await fetch('/api/v1/attendance/punch-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}

async function punchOut() {
  const response = await fetch('/api/v1/attendance/punch-out', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "statusCode": 400,
  "message": "Insufficient leave balance. Available: 5, Requested: 7",
  "error": "Bad Request"
}
```

### Common Error Scenarios

| Endpoint                     | Error                    | Action                                 |
| ---------------------------- | ------------------------ | -------------------------------------- |
| `GET /employee-profiles/me`  | 404 Profile not found    | Show "Profile not set up" state        |
| `GET /leave-balances/me`     | Empty array              | Show "No leave plan assigned" message  |
| `POST /leaves`               | 400 Insufficient balance | Show error with available balance      |
| `POST /leaves`               | 400 No active leave plan | Show "Contact HR to assign leave plan" |
| `POST /attendance/punch-in`  | 400 Already punched in   | Refresh today's attendance state       |
| `POST /attendance/punch-out` | 400 Already punched out  | Refresh today's attendance state       |
| `PATCH /leaves/:id/cancel`   | 404 Not found            | Leave may have been deleted            |
| `PATCH /leaves/:id/cancel`   | 400 Cannot cancel        | Leave already rejected/cancelled       |

### Toast Notification Pattern

```typescript
try {
  await applyLeave(payload);
  toast.success('Leave request submitted successfully');
  router.push('/leave');
} catch (error) {
  toast.error(error.message);
}
```

---

## API Summary Table

| Method             | Endpoint                                     | Description                                         | Auth  |
| ------------------ | -------------------------------------------- | --------------------------------------------------- | ----- |
| **Profile**        |                                              |                                                     |       |
| GET                | `/api/v1/employee-profiles/me`               | Get my profile with compensation, shift, leave plan | All   |
| PATCH              | `/api/v1/employee-profiles/me`               | Update my profile                                   | All   |
| **Leave Balances** |                                              |                                                     |       |
| GET                | `/api/v1/leave-balances/me?year=`            | Get my leave balances                               | All   |
| **Leave Requests** |                                              |                                                     |       |
| GET                | `/api/v1/leaves/me/available-types`          | Get available leave types with balances             | All   |
| POST               | `/api/v1/leaves`                             | Apply for leave                                     | All   |
| GET                | `/api/v1/leaves/me`                          | Get my leave requests                               | All   |
| PATCH              | `/api/v1/leaves/:id/cancel`                  | Cancel my leave request                             | Owner |
| **Attendance**     |                                              |                                                     |       |
| GET                | `/api/v1/attendance/me/today`                | Get today's attendance                              | All   |
| POST               | `/api/v1/attendance/punch-in`                | Punch in                                            | All   |
| POST               | `/api/v1/attendance/punch-out`               | Punch out                                           | All   |
| GET                | `/api/v1/attendance/me/history?month=&year=` | Get attendance history                              | All   |
| GET                | `/api/v1/attendance/me/summary?month=&year=` | Get monthly summary                                 | All   |
