# Leave Management - Backend API Specification

## Overview

This document specifies the backend API endpoints required for the full Leave Management module, covering both **employee self-service** (already implemented) and **HR management** (new endpoints). It also documents enhancements to existing endpoints for half-day leave support and request filtering.

All endpoints require JWT authentication (`Authorization: Bearer <token>`). HR-only endpoints require the `hr` role.

---

## Table of Contents

1. [Existing Employee Endpoints (Reference)](#existing-employee-endpoints-reference)
2. [New: HR Leave Management Endpoints](#new-hr-leave-management-endpoints)
   - [Get All Leave Requests (HR)](#get-all-leave-requests-hr)
   - [Approve Leave Request](#approve-leave-request)
   - [Reject Leave Request](#reject-leave-request)
3. [Enhancement: Half-Day Leave Support](#enhancement-half-day-leave-support)
4. [Enhancement: Leave Request Filtering](#enhancement-leave-request-filtering)
5. [New: Company Holidays Endpoint](#new-company-holidays-endpoint)
6. [Database Schema Changes](#database-schema-changes)
7. [Data Flow Diagrams](#data-flow-diagrams)

---

## Existing Employee Endpoints (Reference)

These endpoints are already implemented. Listed here for completeness.

| Method | Endpoint                            | Description                             | Auth  |
| ------ | ----------------------------------- | --------------------------------------- | ----- |
| GET    | `/api/v1/leave-balances/me?year=`   | Get my leave balances                   | All   |
| GET    | `/api/v1/leaves/me/available-types` | Get available leave types with balances | All   |
| POST   | `/api/v1/leaves`                    | Apply for leave                         | All   |
| GET    | `/api/v1/leaves/me`                 | Get my leave requests                   | All   |
| PATCH  | `/api/v1/leaves/:id/cancel`         | Cancel my leave request                 | Owner |

---

## New: HR Leave Management Endpoints

### Get All Leave Requests (HR)

Returns all leave requests across the organization for HR review. Supports filtering by status, employee, and date range with pagination.

| Method | Endpoint            | Auth    |
| ------ | ------------------- | ------- |
| GET    | `/api/v1/hr/leaves` | HR only |

**Query Parameters:**

| Param       | Type   | Required | Default     | Description                                                      |
| ----------- | ------ | -------- | ----------- | ---------------------------------------------------------------- |
| `status`    | string | No       | -           | Filter by status: `pending`, `approved`, `rejected`, `cancelled` |
| `userId`    | UUID   | No       | -           | Filter by specific employee                                      |
| `startDate` | string | No       | -           | Filter leaves starting on or after this date (`YYYY-MM-DD`)      |
| `endDate`   | string | No       | -           | Filter leaves ending on or before this date (`YYYY-MM-DD`)       |
| `page`      | number | No       | 1           | Page number for pagination                                       |
| `limit`     | number | No       | 20          | Items per page (max 100)                                         |
| `sortBy`    | string | No       | `createdAt` | Sort field: `createdAt`, `startDate`, `status`                   |
| `sortOrder` | string | No       | `desc`      | Sort direction: `asc`, `desc`                                    |

**Request:**

```
GET /api/v1/hr/leaves?status=pending&page=1&limit=20
```

**Response (200):**

```json
{
  "success": true,
  "message": "Leave requests retrieved",
  "data": {
    "leaves": [
      {
        "id": "uuid",
        "userId": "uuid",
        "user": {
          "id": "uuid",
          "firstName": "Ashish",
          "lastName": "Kumar",
          "email": "ashish@example.com"
        },
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
        "isHalfDay": false,
        "halfDayType": null,
        "status": "pending",
        "reviewedBy": null,
        "reviewNote": null,
        "reviewedAt": null,
        "createdAt": "2026-03-10T10:30:00.000Z",
        "updatedAt": "2026-03-10T10:30:00.000Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Key Requirements:**

- Must include `user` relation (firstName, lastName, email) in each leave record
- Must include `leaveTypeConfig` relation (name, code)
- Results sorted by `createdAt` descending by default
- Pending requests should appear first when no status filter is applied

---

### Approve Leave Request

Approve a pending leave request. Sets status to `approved`, records reviewer info, and deducts leave balance.

| Method | Endpoint                     | Auth    |
| ------ | ---------------------------- | ------- |
| PATCH  | `/api/v1/leaves/:id/approve` | HR only |

**Request Body:**

```json
{
  "reviewNote": "Approved. Enjoy your time off."
}
```

| Field        | Type   | Required | Description                           |
| ------------ | ------ | -------- | ------------------------------------- |
| `reviewNote` | string | No       | Optional note from HR to the employee |

**Response (200):**

```json
{
  "success": true,
  "message": "Leave request approved",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "status": "approved",
    "reviewedBy": "hr-user-uuid",
    "reviewNote": "Approved. Enjoy your time off.",
    "reviewedAt": "2026-03-10T14:00:00.000Z",
    "startDate": "2026-03-15",
    "endDate": "2026-03-17",
    "numberOfDays": 2,
    "isHalfDay": false,
    "halfDayType": null,
    "leaveTypeConfig": {
      "id": "uuid",
      "name": "Casual Leave",
      "code": "CL"
    }
  }
}
```

**Validation Errors (400):**

| Error                                         | When                             |
| --------------------------------------------- | -------------------------------- |
| `Leave request not found`                     | Invalid leave ID                 |
| `Only pending leave requests can be approved` | Leave is not in `pending` status |

**Side Effects:**

- Set `status = 'approved'`, `reviewedBy = current HR user ID`, `reviewedAt = now()`
- The leave balance deduction should already have been applied when the leave was created (on `POST /api/v1/leaves`). If the system defers deduction until approval, deduct the balance here and create a `deduction` leave transaction.

---

### Reject Leave Request

Reject a pending leave request. Sets status to `rejected` and restores leave balance if it was pre-deducted.

| Method | Endpoint                    | Auth    |
| ------ | --------------------------- | ------- |
| PATCH  | `/api/v1/leaves/:id/reject` | HR only |

**Request Body:**

```json
{
  "reviewNote": "Insufficient staffing during this period."
}
```

| Field        | Type   | Required | Description               |
| ------------ | ------ | -------- | ------------------------- |
| `reviewNote` | string | No       | Optional rejection reason |

**Response (200):**

```json
{
  "success": true,
  "message": "Leave request rejected",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "status": "rejected",
    "reviewedBy": "hr-user-uuid",
    "reviewNote": "Insufficient staffing during this period.",
    "reviewedAt": "2026-03-10T14:00:00.000Z",
    "startDate": "2026-03-15",
    "endDate": "2026-03-17",
    "numberOfDays": 2,
    "isHalfDay": false,
    "halfDayType": null
  }
}
```

**Validation Errors (400):**

| Error                                         | When                             |
| --------------------------------------------- | -------------------------------- |
| `Leave request not found`                     | Invalid leave ID                 |
| `Only pending leave requests can be rejected` | Leave is not in `pending` status |

**Side Effects:**

- Set `status = 'rejected'`, `reviewedBy = current HR user ID`, `reviewedAt = now()`
- If the leave balance was pre-deducted on application, restore the balance and create a `reversal` leave transaction

---

## Enhancement: Half-Day Leave Support

### Changes to `POST /api/v1/leaves`

Add two optional fields to the existing apply-leave endpoint:

**Updated Request Body:**

```json
{
  "leaveTypeConfigId": "uuid-of-leave-type",
  "startDate": "2026-03-15",
  "endDate": "2026-03-15",
  "reason": "Doctor appointment",
  "isHalfDay": true,
  "halfDayType": "first_half"
}
```

| Field         | Type    | Required    | Default | Description                                                            |
| ------------- | ------- | ----------- | ------- | ---------------------------------------------------------------------- |
| `isHalfDay`   | boolean | No          | `false` | Whether this is a half-day leave                                       |
| `halfDayType` | enum    | Conditional | -       | Required when `isHalfDay` is true. Values: `first_half`, `second_half` |

**Validation Rules:**

| Rule                                                     | Error Message                                   |
| -------------------------------------------------------- | ----------------------------------------------- |
| `isHalfDay` is true but `halfDayType` is missing         | `halfDayType is required for half-day leave`    |
| `isHalfDay` is true but `startDate !== endDate`          | `Half-day leave must be for a single day`       |
| `halfDayType` value is not `first_half` or `second_half` | `halfDayType must be first_half or second_half` |

**Calculation Change:**

When `isHalfDay` is true:

- `numberOfDays` should be `0.5` instead of `1`
- Leave balance deduction should be `0.5` day

**Updated Response:**

```json
{
  "success": true,
  "message": "Leave request created",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "leaveTypeConfigId": "uuid",
    "startDate": "2026-03-15",
    "endDate": "2026-03-15",
    "numberOfDays": 0.5,
    "reason": "Doctor appointment",
    "isHalfDay": true,
    "halfDayType": "first_half",
    "status": "pending",
    "reviewedBy": null,
    "reviewNote": null,
    "reviewedAt": null,
    "createdAt": "2026-03-10T10:30:00.000Z",
    "updatedAt": "2026-03-10T10:30:00.000Z"
  }
}
```

### Database Column Changes

Add to the `leaves` table:

```sql
ALTER TABLE leaves ADD COLUMN is_half_day BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leaves ADD COLUMN half_day_type VARCHAR(20) DEFAULT NULL;
-- half_day_type: 'first_half' or 'second_half'
```

---

## Enhancement: Leave Request Filtering

### Changes to `GET /api/v1/leaves/me`

Add optional query parameters for filtering the employee's own leave requests:

| Param       | Type   | Required | Default | Description                                                      |
| ----------- | ------ | -------- | ------- | ---------------------------------------------------------------- |
| `status`    | string | No       | -       | Filter by status: `pending`, `approved`, `rejected`, `cancelled` |
| `startDate` | string | No       | -       | Filter leaves starting on or after this date                     |
| `endDate`   | string | No       | -       | Filter leaves ending on or before this date                      |
| `page`      | number | No       | 1       | Page number                                                      |
| `limit`     | number | No       | 50      | Items per page (max 100)                                         |

**Example:**

```
GET /api/v1/leaves/me?status=pending&page=1&limit=10
```

**Response remains the same structure** but filtered and paginated:

```json
{
  "success": true,
  "message": "Leave requests retrieved",
  "data": [...]
}
```

---

## New: Company Holidays Endpoint

Returns the list of company holidays for a given year. Used by the frontend to show upcoming holidays and to help employees plan their leave.

| Method | Endpoint           | Auth                   |
| ------ | ------------------ | ---------------------- |
| GET    | `/api/v1/holidays` | Any authenticated user |

**Query Parameters:**

| Param  | Type   | Required | Default      | Description                |
| ------ | ------ | -------- | ------------ | -------------------------- |
| `year` | number | No       | Current year | Year to fetch holidays for |

**Response (200):**

```json
{
  "success": true,
  "message": "Holidays retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "Republic Day",
      "date": "2026-01-26",
      "type": "national",
      "isOptional": false
    },
    {
      "id": "uuid",
      "name": "Holi",
      "date": "2026-03-17",
      "type": "national",
      "isOptional": false
    },
    {
      "id": "uuid",
      "name": "Christmas",
      "date": "2026-12-25",
      "type": "restricted",
      "isOptional": true
    }
  ]
}
```

**Holiday Types:**

| Type         | Description                                       |
| ------------ | ------------------------------------------------- |
| `national`   | Mandatory national holiday                        |
| `regional`   | Regional/state-specific holiday                   |
| `restricted` | Optional/restricted holiday (employee can choose) |
| `company`    | Company-specific holiday (e.g., foundation day)   |

### Database Schema for Holidays

```sql
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'national',
  is_optional BOOLEAN NOT NULL DEFAULT false,
  holiday_list_id UUID REFERENCES holiday_lists(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Database Schema Changes

### Summary of All Schema Changes

```sql
-- 1. Half-day leave support on the leaves table
ALTER TABLE leaves ADD COLUMN is_half_day BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leaves ADD COLUMN half_day_type VARCHAR(20) DEFAULT NULL;

-- 2. Holidays table (if not already existing)
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'national',
  is_optional BOOLEAN NOT NULL DEFAULT false,
  holiday_list_id UUID REFERENCES holiday_lists(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_list ON holidays(holiday_list_id);
```

### Prisma Schema Changes

```prisma
model Leave {
  // ... existing fields ...
  isHalfDay    Boolean     @default(false) @map("is_half_day")
  halfDayType  String?     @map("half_day_type")
}

model Holiday {
  id            String      @id @default(uuid())
  name          String      @db.VarChar(100)
  date          DateTime    @db.Date
  type          String      @default("national") @db.VarChar(20)
  isOptional    Boolean     @default(false) @map("is_optional")
  holidayListId String?     @map("holiday_list_id")
  holidayList   HolidayList? @relation(fields: [holidayListId], references: [id])
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@index([date])
  @@map("holidays")
}
```

---

## Data Flow Diagrams

### HR Approval Flow

```
Employee                          Backend                           HR
   │                                │                               │
   ├── POST /api/v1/leaves ────────►│                               │
   │   (apply for leave)            │                               │
   │                                ├── Validate dates, balance     │
   │                                ├── Create leave (pending)      │
   │                                ├── Deduct balance              │
   │◄── 201 Leave created ─────────┤                               │
   │                                │                               │
   │                                │◄── GET /api/v1/hr/leaves ─────┤
   │                                │    ?status=pending            │
   │                                ├── Return pending leaves ─────►│
   │                                │                               │
   │                                │    ┌─────────────────────┐    │
   │                                │    │  HR Reviews Request  │    │
   │                                │    └─────────┬───────────┘    │
   │                                │              │                │
   │                                │   ┌──────────┴──────────┐    │
   │                                │   ▼                     ▼    │
   │                                │◄─ PATCH .../approve  PATCH .../reject
   │                                │   │                     │    │
   │                                │   ├─ Set approved       ├─ Set rejected
   │                                │   ├─ Record reviewer    ├─ Record reviewer
   │                                │   └─ Keep balance       └─ Restore balance
   │                                │                               │
   │                                ├── 200 Updated ───────────────►│
```

### Half-Day Leave Flow

```
1. Employee opens Apply Leave dialog
     │
2. Selects "Half Day" toggle
     │ → Shows "First Half" / "Second Half" selector
     │ → Hides "End Date" (auto-set to same as Start Date)
     │
3. POST /api/v1/leaves
     │ body: { leaveTypeConfigId, startDate, endDate: startDate,
     │         isHalfDay: true, halfDayType: "first_half" }
     │
4. Backend validates:
     │ ├── startDate === endDate ✓
     │ ├── halfDayType is valid ✓
     │ ├── Balance >= 0.5 ✓
     │ └── Sets numberOfDays = 0.5
     │
5. Returns created leave with numberOfDays: 0.5
```

---

## API Summary Table

| Method                  | Endpoint                            | Description               | Auth  | Status             |
| ----------------------- | ----------------------------------- | ------------------------- | ----- | ------------------ |
| **Employee (Existing)** |                                     |                           |       |                    |
| GET                     | `/api/v1/leave-balances/me?year=`   | Get my leave balances     | All   | Implemented        |
| GET                     | `/api/v1/leaves/me/available-types` | Get available leave types | All   | Implemented        |
| POST                    | `/api/v1/leaves`                    | Apply for leave           | All   | Enhance (half-day) |
| GET                     | `/api/v1/leaves/me`                 | Get my leave requests     | All   | Enhance (filters)  |
| PATCH                   | `/api/v1/leaves/:id/cancel`         | Cancel my leave           | Owner | Implemented        |
| **HR Management (New)** |                                     |                           |       |                    |
| GET                     | `/api/v1/hr/leaves`                 | Get all leave requests    | HR    | **New**            |
| PATCH                   | `/api/v1/leaves/:id/approve`        | Approve leave request     | HR    | **New**            |
| PATCH                   | `/api/v1/leaves/:id/reject`         | Reject leave request      | HR    | **New**            |
| **Holidays (New)**      |                                     |                           |       |                    |
| GET                     | `/api/v1/holidays?year=`            | Get company holidays      | All   | **New**            |

---

## Implementation Checklist

### Backend Tasks

- [ ] Add `is_half_day` and `half_day_type` columns to leaves table (migration)
- [ ] Update Leave entity/model with new fields
- [ ] Update `POST /api/v1/leaves` validation for half-day rules
- [ ] Update `numberOfDays` calculation to return `0.5` for half-day leaves
- [ ] Create `GET /api/v1/hr/leaves` endpoint with filtering and pagination
- [ ] Create `PATCH /api/v1/leaves/:id/approve` endpoint
- [ ] Create `PATCH /api/v1/leaves/:id/reject` endpoint
- [ ] Add HR role guard to HR leave endpoints
- [ ] Include `user` relation in HR leave query results
- [ ] Handle balance reversal on reject (if balance is pre-deducted)
- [ ] Add optional query params to `GET /api/v1/leaves/me` (status, date range, pagination)
- [ ] Create holidays table (migration)
- [ ] Create `GET /api/v1/holidays` endpoint
- [ ] Seed holidays data for current year
