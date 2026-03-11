# Employee Profile - Frontend Integration Guide

## Overview

This document defines the **Employee Profile** section for HR-facing profile pages.  
It lists what information should be shown, what should be editable, and how frontend validation should map to backend rules.

All profile APIs are HR-only and require `Authorization: Bearer <jwt>`.

---

## Table of Contents

1. [Scope and Profile Sections](#scope-and-profile-sections)
2. [Field Catalog (What Info We Add)](#field-catalog-what-info-we-add)
3. [Editability Rules](#editability-rules)
4. [Validation Rules](#validation-rules)
5. [API Mapping](#api-mapping)
6. [Frontend Behavior Notes](#frontend-behavior-notes)
7. [Suggested UI Layout](#suggested-ui-layout)
8. [Future Enhancements (Optional)](#future-enhancements-optional)

---

## Scope and Profile Sections

The profile section should be grouped into these blocks:

1. **Personal Information**
2. **Employment Identifiers**
3. **Job Information**
4. **Organization Mapping**
5. **Policy and Access Controls**
6. **System Metadata (read-only)**

These groups map directly to the backend profile model and related user data.

---

## Field Catalog (What Info We Add)

### 1) Personal Information

| Field          | Type           | Notes                     |
| -------------- | -------------- | ------------------------- |
| `firstName`    | string         | From `User` entity        |
| `lastName`     | string         | From `User` entity        |
| `middleName`   | string \| null | Optional                  |
| `displayName`  | string \| null | Optional                  |
| `gender`       | enum \| null   | `male`, `female`, `other` |
| `dateOfBirth`  | date \| null   | Format `YYYY-MM-DD`       |
| `nationality`  | string \| null | Optional                  |
| `workCountry`  | string \| null | Optional                  |
| `mobileNumber` | string \| null | Optional                  |

### 2) Employment Identifiers

| Field              | Type           | Notes                     |
| ------------------ | -------------- | ------------------------- |
| `employeeNumber`   | string         | Unique identifier         |
| `numberSeries`     | string \| null | Optional prefix/reference |
| `attendanceNumber` | string \| null | Optional attendance ID    |

### 3) Job Information

| Field                 | Type           | Notes                                           |
| --------------------- | -------------- | ----------------------------------------------- |
| `joiningDate`         | date \| null   | Format `YYYY-MM-DD`                             |
| `jobTitle`            | string \| null | Primary title                                   |
| `secondaryJobTitle`   | string \| null | Secondary title                                 |
| `timeType`            | enum           | `full_time`, `part_time`, `contract`            |
| `workerType`          | enum \| null   | `permanent`, `contract`, `intern`, `consultant` |
| `reportingManagerId`  | uuid \| null   | Manager (solid line)                            |
| `dottedLineManagerId` | uuid \| null   | Secondary manager                               |

### 4) Organization Mapping

| Field            | Type         | Notes                |
| ---------------- | ------------ | -------------------- |
| `departmentId`   | uuid \| null | From `User` entity   |
| `legalEntityId`  | uuid \| null | Organization mapping |
| `businessUnitId` | uuid \| null | Organization mapping |
| `locationId`     | uuid \| null | Work location        |

### 5) Policy and Access Controls

| Field                   | Type           | Notes                    |
| ----------------------- | -------------- | ------------------------ |
| `probationPolicyMonths` | number \| null | Integer                  |
| `noticePeriodDays`      | number \| null | Integer                  |
| `holidayListId`         | uuid \| null   | Holiday calendar mapping |
| `inviteToLogin`         | boolean        | Access toggle            |
| `enableOnboardingFlow`  | boolean        | Onboarding toggle        |

### 6) System Metadata (Read-only)

| Field       | Type     | Notes              |
| ----------- | -------- | ------------------ |
| `id`        | uuid     | Profile ID         |
| `userId`    | uuid     | User reference     |
| `email`     | string   | From `User` entity |
| `createdAt` | datetime | Auto-managed       |
| `updatedAt` | datetime | Auto-managed       |

---

## Editability Rules

### Editable on profile update

- Most optional profile fields are editable via `PATCH /api/v1/employee-profiles/:userId`
- Typical editable examples:
  - `displayName`, `middleName`, `mobileNumber`
  - `jobTitle`, `secondaryJobTitle`, `timeType`, `workerType`
  - `reportingManagerId`, `dottedLineManagerId`
  - `legalEntityId`, `businessUnitId`, `locationId`, `holidayListId`
  - `probationPolicyMonths`, `noticePeriodDays`
  - `inviteToLogin`, `enableOnboardingFlow`, `attendanceNumber`

### Read-only / immutable in update API

- `userId` cannot be changed in update DTO
- `employeeNumber` cannot be changed in update DTO
- `id`, `createdAt`, `updatedAt` are system-managed

### Profile creation constraints

- One profile per `userId`
- `employeeNumber` must be unique

---

## Validation Rules

### Required on create

| Field            | Rule                               |
| ---------------- | ---------------------------------- |
| `userId`         | Required, valid UUID               |
| `employeeNumber` | Required, non-empty string, max 50 |

### String limits

| Field               | Rule              |
| ------------------- | ----------------- |
| `middleName`        | Optional, max 255 |
| `displayName`       | Optional, max 255 |
| `nationality`       | Optional, max 255 |
| `workCountry`       | Optional, max 255 |
| `jobTitle`          | Optional, max 255 |
| `secondaryJobTitle` | Optional, max 255 |
| `numberSeries`      | Optional, max 20  |
| `mobileNumber`      | Optional, max 20  |
| `attendanceNumber`  | Optional, max 50  |

### Enum rules

| Field        | Allowed values                                  |
| ------------ | ----------------------------------------------- |
| `gender`     | `male`, `female`, `other`                       |
| `timeType`   | `full_time`, `part_time`, `contract`            |
| `workerType` | `permanent`, `contract`, `intern`, `consultant` |

### Date rules

| Field         | Rule                                       |
| ------------- | ------------------------------------------ |
| `dateOfBirth` | Optional, valid date string (`YYYY-MM-DD`) |
| `joiningDate` | Optional, valid date string (`YYYY-MM-DD`) |

### Numeric rules

| Field                   | Rule                      |
| ----------------------- | ------------------------- |
| `probationPolicyMonths` | Optional integer, `0-36`  |
| `noticePeriodDays`      | Optional integer, `0-365` |

### Boolean rules

| Field                  | Rule             |
| ---------------------- | ---------------- |
| `inviteToLogin`        | Optional boolean |
| `enableOnboardingFlow` | Optional boolean |

### UUID relation rules

Optional but must be valid UUID when present:

- `reportingManagerId`
- `dottedLineManagerId`
- `legalEntityId`
- `businessUnitId`
- `locationId`
- `holidayListId`

---

## API Mapping

| Method  | Endpoint                            | Use            |
| ------- | ----------------------------------- | -------------- |
| `POST`  | `/api/v1/employee-profiles`         | Create profile |
| `GET`   | `/api/v1/employee-profiles/:userId` | View profile   |
| `PATCH` | `/api/v1/employee-profiles/:userId` | Update profile |

### Get profile response shape (example)

```json
{
  "success": true,
  "message": "Employee profile retrieved",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "employeeNumber": "EMP-001",
    "displayName": "Employee Name",
    "timeType": "full_time",
    "reportingManager": {
      "id": "uuid",
      "firstName": "Admin",
      "lastName": "User"
    },
    "legalEntity": { "id": "uuid", "name": "Acme India" },
    "businessUnit": { "id": "uuid", "name": "Engineering" },
    "location": { "id": "uuid", "name": "Bangalore HQ" },
    "holidayList": { "id": "uuid", "name": "India 2026 Holidays" }
  }
}
```

---

## Frontend Behavior Notes

- Use async dropdowns for all relation IDs (`manager`, `legalEntity`, `businessUnit`, `location`, `holidayList`).
- Show labels from related records while storing UUID values in form state.
- For update forms, hide or disable immutable fields (`employeeNumber`, `userId`).
- Treat null/empty optional values as valid; do not force defaults except where UX requires.
- Surface backend validation messages directly per field when possible.

---

## Suggested UI Layout

```text
EmployeeProfilePage
├── PersonalInformationCard
├── EmploymentIdentifiersCard
├── JobInformationCard
├── OrganizationMappingCard
├── PolicyAndAccessCard
└── ProfileMetadataCard (read-only)
```

---

## Future Enhancements (Optional)

These are not yet part of current backend profile DTOs, but can be discussed for a later phase:

- Emergency contact name and phone
- Official work phone and extension
- Personal address and current address
- Profile photo/avatar URL
- Blood group and disability/accommodation metadata
- Bank and payroll preference metadata (if not covered elsewhere)

If these are added later, backend DTO/entity and validation rules must be updated before frontend rollout.
