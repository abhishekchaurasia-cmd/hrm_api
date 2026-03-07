# Employee Onboarding - Frontend Integration Guide

## Overview

This document covers the **Employee Onboarding** feature: a Keka-style multi-step wizard that creates a new employee with profile details, job assignment, shift/leave/holiday allocation, and compensation — all in a single transactional API call.

All endpoints below require **HR role** authentication (`Authorization: Bearer <jwt>`).

---

## Table of Contents

1. [Architecture](#architecture)
2. [Supporting CRUD APIs](#supporting-crud-apis)
   - [Organization (Legal Entities, Business Units, Locations)](#organization-apis)
   - [Holiday Lists & Holidays](#holiday-apis)
   - [Salary Components](#salary-component-apis)
   - [Employee Profiles](#employee-profile-apis)
   - [Compensation](#compensation-apis)
3. [Onboarding Wizard API](#onboarding-wizard-api)
4. [Frontend Routing](#frontend-routing)
5. [Wizard Component Hierarchy](#wizard-component-hierarchy)
6. [Form Validation Rules](#form-validation-rules)
7. [Dropdown Data Loading](#dropdown-data-loading)
8. [State Management Examples](#state-management-examples)
9. [Error Handling](#error-handling)

---

## Architecture

```
┌────────────────────────────────────────────────────┐
│             Onboarding Wizard (4 Tabs)             │
│                                                    │
│  Tab 1: Basic Details    Tab 2: Job Details        │
│  Tab 3: More Details     Tab 4: Compensation       │
│                                                    │
│  [Submit] ──► POST /api/v1/employee-onboarding     │
└────────────────────────────────────────────────────┘
                         │
                    Transaction
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   Create User    Assign Shift    Create Compensation
   Create Profile Assign Leave    Set Salary Breakup
                  Init Balances
```

All steps run within a single database transaction — if any step fails, everything rolls back.

---

## Supporting CRUD APIs

### Organization APIs

These manage the organizational structure (referenced in Job Details tab).

#### Legal Entities

| Method | Endpoint                     | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| POST   | `/api/v1/legal-entities`     | Create                        |
| GET    | `/api/v1/legal-entities`     | List all                      |
| GET    | `/api/v1/legal-entities/:id` | Get one (with business units) |
| PATCH  | `/api/v1/legal-entities/:id` | Update                        |
| DELETE | `/api/v1/legal-entities/:id` | Deactivate                    |

**Create Request:**

```json
{
  "name": "Acme Corp India",
  "description": "Indian subsidiary"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Legal entity created",
  "data": {
    "id": "uuid",
    "name": "Acme Corp India",
    "description": "Indian subsidiary",
    "isActive": true,
    "createdAt": "2026-03-06T...",
    "updatedAt": "2026-03-06T..."
  }
}
```

#### Business Units

| Method | Endpoint                     | Description                  |
| ------ | ---------------------------- | ---------------------------- |
| POST   | `/api/v1/business-units`     | Create                       |
| GET    | `/api/v1/business-units`     | List all (with legal entity) |
| GET    | `/api/v1/business-units/:id` | Get one                      |
| PATCH  | `/api/v1/business-units/:id` | Update                       |
| DELETE | `/api/v1/business-units/:id` | Deactivate                   |

**Create Request:**

```json
{
  "name": "Engineering",
  "legalEntityId": "uuid",
  "description": "Engineering division"
}
```

#### Locations

| Method | Endpoint                | Description |
| ------ | ----------------------- | ----------- |
| POST   | `/api/v1/locations`     | Create      |
| GET    | `/api/v1/locations`     | List all    |
| GET    | `/api/v1/locations/:id` | Get one     |
| PATCH  | `/api/v1/locations/:id` | Update      |
| DELETE | `/api/v1/locations/:id` | Deactivate  |

**Create Request:**

```json
{
  "name": "Bangalore HQ",
  "address": "100 MG Road",
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India"
}
```

---

### Holiday APIs

| Method | Endpoint                                            | Description         |
| ------ | --------------------------------------------------- | ------------------- |
| POST   | `/api/v1/holiday-lists`                             | Create holiday list |
| GET    | `/api/v1/holiday-lists`                             | List all            |
| GET    | `/api/v1/holiday-lists/:id`                         | Get with holidays   |
| PATCH  | `/api/v1/holiday-lists/:id`                         | Update list         |
| DELETE | `/api/v1/holiday-lists/:id`                         | Deactivate list     |
| POST   | `/api/v1/holiday-lists/:listId/holidays`            | Add holiday         |
| PATCH  | `/api/v1/holiday-lists/:listId/holidays/:holidayId` | Update holiday      |
| DELETE | `/api/v1/holiday-lists/:listId/holidays/:holidayId` | Remove holiday      |

**Create Holiday List:**

```json
{
  "name": "India 2026 Holidays",
  "year": 2026,
  "description": "National and regional holidays"
}
```

**Add Holiday:**

```json
{
  "name": "Republic Day",
  "date": "2026-01-26",
  "isOptional": false
}
```

**Get Holiday List Response (with holidays):**

```json
{
  "success": true,
  "message": "Holiday list retrieved",
  "data": {
    "id": "uuid",
    "name": "India 2026 Holidays",
    "year": 2026,
    "holidays": [
      {
        "id": "uuid",
        "name": "Republic Day",
        "date": "2026-01-26",
        "isOptional": false
      },
      {
        "id": "uuid",
        "name": "Holi",
        "date": "2026-03-17",
        "isOptional": true
      }
    ]
  }
}
```

---

### Salary Component APIs

| Method | Endpoint                        | Description               |
| ------ | ------------------------------- | ------------------------- |
| POST   | `/api/v1/salary-components`     | Create component template |
| GET    | `/api/v1/salary-components`     | List all                  |
| PATCH  | `/api/v1/salary-components/:id` | Update                    |
| DELETE | `/api/v1/salary-components/:id` | Deactivate                |

**Create Request:**

```json
{
  "name": "Basic Salary",
  "code": "BASIC",
  "componentType": "earning",
  "calculationType": "percentage_of_gross",
  "defaultPercentage": 40.0,
  "isMandatory": true
}
```

**Enums:**

- `componentType`: `earning`, `deduction`
- `calculationType`: `fixed`, `percentage_of_basic`, `percentage_of_gross`

---

### Employee Profile APIs

| Method | Endpoint                            | Description             |
| ------ | ----------------------------------- | ----------------------- |
| POST   | `/api/v1/employee-profiles`         | Create profile for user |
| GET    | `/api/v1/employee-profiles/:userId` | Get profile             |
| PATCH  | `/api/v1/employee-profiles/:userId` | Update profile          |

**Get Response (includes relations):**

```json
{
  "success": true,
  "message": "Employee profile retrieved",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "employeeNumber": "EMP-001",
    "displayName": "Saikanth Joshi",
    "gender": "male",
    "dateOfBirth": "1995-06-19",
    "nationality": "India",
    "joiningDate": "2026-03-01",
    "jobTitle": "Software Engineer",
    "timeType": "full_time",
    "workerType": "permanent",
    "probationPolicyMonths": 3,
    "noticePeriodDays": 30,
    "reportingManager": {
      "id": "uuid",
      "firstName": "Admin",
      "lastName": "User"
    },
    "legalEntity": { "id": "uuid", "name": "Acme Corp India" },
    "businessUnit": { "id": "uuid", "name": "Engineering" },
    "location": { "id": "uuid", "name": "Bangalore HQ" },
    "holidayList": { "id": "uuid", "name": "India 2026 Holidays" }
  }
}
```

---

### Compensation APIs

| Method | Endpoint                                 | Description                      |
| ------ | ---------------------------------------- | -------------------------------- |
| POST   | `/api/v1/compensations`                  | Create compensation              |
| GET    | `/api/v1/compensations/employee/:userId` | Get active compensation          |
| PATCH  | `/api/v1/compensations/:id`              | Update                           |
| GET    | `/api/v1/compensations/:id/breakup`      | Get salary breakup               |
| PUT    | `/api/v1/compensations/:id/breakup`      | Set salary breakup (replace all) |

**Create Compensation:**

```json
{
  "userId": "uuid",
  "annualSalary": 1200000,
  "currency": "INR",
  "salaryEffectiveFrom": "2026-03-01",
  "regularSalary": 1100000,
  "bonus": 100000,
  "isEsiEligible": false,
  "taxRegime": "new_regime"
}
```

**Set Salary Breakup:**

```json
{
  "breakup": [
    { "salaryComponentId": "uuid-basic", "annualAmount": 480000 },
    { "salaryComponentId": "uuid-hra", "annualAmount": 240000 },
    { "salaryComponentId": "uuid-special", "annualAmount": 180000 }
  ]
}
```

**Get Breakup Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "salaryComponentId": "uuid-basic",
      "annualAmount": 480000,
      "monthlyAmount": 40000,
      "salaryComponent": {
        "id": "uuid-basic",
        "name": "Basic Salary",
        "code": "BASIC",
        "componentType": "earning"
      }
    }
  ]
}
```

**Enums:**

- `taxRegime`: `old_regime`, `new_regime`

---

## Onboarding Wizard API

### `POST /api/v1/employee-onboarding`

Single transactional endpoint that handles the entire 4-tab wizard.

**Full Request Body:**

```json
{
  "basicDetails": {
    "firstName": "Saikanth",
    "lastName": "Joshi",
    "email": "saikanth@example.com",
    "password": "tempPass123!",
    "middleName": null,
    "displayName": "Saikanth Joshi",
    "gender": "male",
    "dateOfBirth": "1995-06-19",
    "nationality": "India",
    "workCountry": "India",
    "employeeNumber": "EMP-044",
    "numberSeries": "EMP",
    "mobileNumber": "+91-9876543210"
  },
  "jobDetails": {
    "joiningDate": "2026-03-01",
    "jobTitle": "Software Engineer",
    "timeType": "full_time",
    "workerType": "permanent",
    "departmentId": "uuid",
    "legalEntityId": "uuid",
    "businessUnitId": "uuid",
    "locationId": "uuid",
    "reportingManagerId": "uuid",
    "probationPolicyMonths": 3,
    "noticePeriodDays": 30
  },
  "moreDetails": {
    "inviteToLogin": true,
    "enableOnboardingFlow": true,
    "leavePlanId": "uuid",
    "holidayListId": "uuid",
    "shiftId": "uuid",
    "attendanceNumber": "ATT-044"
  },
  "compensation": {
    "annualSalary": 1200000,
    "currency": "INR",
    "salaryEffectiveFrom": "2026-03-01",
    "regularSalary": 1100000,
    "bonus": 100000,
    "isEsiEligible": false,
    "taxRegime": "new_regime",
    "breakup": [
      { "salaryComponentId": "uuid", "annualAmount": 480000 },
      { "salaryComponentId": "uuid", "annualAmount": 240000 }
    ]
  }
}
```

**Only `basicDetails` is required.** All other sections (`jobDetails`, `moreDetails`, `compensation`) are optional and can be submitted partially.

**If `employeeNumber` is not provided**, the system auto-generates it using the `numberSeries` prefix (e.g. `EMP-001`, `EMP-002`).

**Success Response (201):**

```json
{
  "success": true,
  "message": "Employee onboarded successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "saikanth@example.com",
      "firstName": "Saikanth",
      "lastName": "Joshi"
    },
    "profile": {
      "id": "uuid",
      "employeeNumber": "EMP-044"
    },
    "shiftAssignment": {
      "id": "uuid",
      "shiftId": "uuid"
    },
    "leavePlanAssignment": {
      "id": "uuid",
      "leavePlanId": "uuid"
    },
    "compensation": {
      "id": "uuid",
      "annualSalary": 1200000
    }
  }
}
```

**Error Response (400):**

```json
{
  "statusCode": 400,
  "message": "An account with this email already exists"
}
```

---

## Frontend Routing

```
/admin/onboarding                    → Employee list / onboarding dashboard
/admin/onboarding/new                → Onboarding wizard (4 tabs)
/admin/onboarding/:userId            → View onboarded employee details

/admin/organization/legal-entities   → Legal entities CRUD
/admin/organization/business-units   → Business units CRUD
/admin/organization/locations        → Locations CRUD

/admin/holidays                      → Holiday lists management
/admin/holidays/:listId              → Holiday list detail with holidays

/admin/salary-components             → Salary component templates

/admin/compensation/:userId          → Employee compensation detail
```

All routes should be protected by an HR role guard on the frontend.

---

## Wizard Component Hierarchy

```
<OnboardingWizard>
  ├── <WizardStepper currentStep={step} />
  │
  ├── Step 1: <BasicDetailsForm>
  │   ├── firstName*, lastName*, email*, password*
  │   ├── middleName, displayName
  │   ├── gender (dropdown), dateOfBirth (date picker)
  │   ├── nationality, workCountry
  │   ├── employeeNumber, numberSeries
  │   └── mobileNumber
  │
  ├── Step 2: <JobDetailsForm>
  │   ├── joiningDate (date picker)
  │   ├── jobTitle
  │   ├── timeType (dropdown: full_time, part_time, contract)
  │   ├── workerType (dropdown: permanent, contract, intern, consultant)
  │   ├── departmentId (async dropdown → GET /api/v1/departments)
  │   ├── legalEntityId (async dropdown → GET /api/v1/legal-entities)
  │   ├── businessUnitId (async dropdown → GET /api/v1/business-units)
  │   ├── locationId (async dropdown → GET /api/v1/locations)
  │   ├── reportingManagerId (async dropdown → GET /api/v1/users)
  │   ├── probationPolicyMonths (number)
  │   └── noticePeriodDays (number)
  │
  ├── Step 3: <MoreDetailsForm>
  │   ├── inviteToLogin (toggle)
  │   ├── enableOnboardingFlow (toggle)
  │   ├── shiftId (async dropdown → GET /api/v1/shifts)
  │   ├── leavePlanId (async dropdown → GET /api/v1/leave-plans)
  │   ├── holidayListId (async dropdown → GET /api/v1/holiday-lists)
  │   └── attendanceNumber
  │
  ├── Step 4: <CompensationForm>
  │   ├── annualSalary (number input)
  │   ├── currency (dropdown, default INR)
  │   ├── salaryEffectiveFrom (date picker)
  │   ├── regularSalary (number)
  │   ├── bonus (number)
  │   ├── isEsiEligible (toggle)
  │   ├── taxRegime (dropdown: old_regime, new_regime)
  │   └── <SalaryBreakupTable>
  │       ├── Load components from GET /api/v1/salary-components
  │       ├── For each: salaryComponentId + annualAmount input
  │       └── Shows computed monthlyAmount (annualAmount / 12)
  │
  └── <WizardActions>
      ├── [Back] (previous step)
      ├── [Next] (validate current step, go to next)
      └── [Submit] (POST /api/v1/employee-onboarding)
```

---

## Form Validation Rules

### Tab 1: Basic Details

| Field            | Rule                                                   |
| ---------------- | ------------------------------------------------------ |
| `firstName`      | Required, max 255 chars                                |
| `lastName`       | Required, max 255 chars                                |
| `email`          | Required, valid email format                           |
| `password`       | Required, min 8 chars, max 128 chars                   |
| `gender`         | Optional, one of: `male`, `female`, `other`            |
| `dateOfBirth`    | Optional, valid date (YYYY-MM-DD), must be in the past |
| `employeeNumber` | Optional (auto-generated if empty), max 50 chars       |
| `mobileNumber`   | Optional, max 20 chars                                 |

### Tab 2: Job Details

| Field                   | Rule                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `joiningDate`           | Optional, valid date (YYYY-MM-DD)                                 |
| `jobTitle`              | Optional, max 255 chars                                           |
| `timeType`              | Optional, one of: `full_time`, `part_time`, `contract`            |
| `workerType`            | Optional, one of: `permanent`, `contract`, `intern`, `consultant` |
| `departmentId`          | Optional, valid UUID (from dropdown)                              |
| `legalEntityId`         | Optional, valid UUID (from dropdown)                              |
| `businessUnitId`        | Optional, valid UUID (from dropdown)                              |
| `locationId`            | Optional, valid UUID (from dropdown)                              |
| `reportingManagerId`    | Optional, valid UUID (from dropdown)                              |
| `probationPolicyMonths` | Optional, integer 0–36                                            |
| `noticePeriodDays`      | Optional, integer 0–365                                           |

### Tab 3: More Details

| Field                  | Rule                   |
| ---------------------- | ---------------------- |
| `inviteToLogin`        | Optional, boolean      |
| `enableOnboardingFlow` | Optional, boolean      |
| `shiftId`              | Optional, valid UUID   |
| `leavePlanId`          | Optional, valid UUID   |
| `holidayListId`        | Optional, valid UUID   |
| `attendanceNumber`     | Optional, max 50 chars |

### Tab 4: Compensation

| Field                         | Rule                                         |
| ----------------------------- | -------------------------------------------- |
| `annualSalary`                | Required if tab used, number ≥ 0             |
| `currency`                    | Optional, max 10 chars, default `INR`        |
| `salaryEffectiveFrom`         | Required if tab used, valid date             |
| `regularSalary`               | Required if tab used, number ≥ 0             |
| `bonus`                       | Optional, number ≥ 0                         |
| `isEsiEligible`               | Optional, boolean                            |
| `taxRegime`                   | Optional, one of: `old_regime`, `new_regime` |
| `breakup[].salaryComponentId` | Required per item, valid UUID                |
| `breakup[].annualAmount`      | Required per item, number ≥ 0                |

---

## Dropdown Data Loading

Before the wizard form renders, prefetch these dropdown options:

```typescript
// All dropdown data can be fetched in parallel
const [
  departments,
  legalEntities,
  businessUnits,
  locations,
  users,
  shifts,
  leavePlans,
  holidayLists,
  salaryComponents,
] = await Promise.all([
  api.get('/api/v1/departments'),
  api.get('/api/v1/legal-entities'),
  api.get('/api/v1/business-units'),
  api.get('/api/v1/locations'),
  api.get('/api/v1/users'),
  api.get('/api/v1/shifts'),
  api.get('/api/v1/leave-plans'),
  api.get('/api/v1/holiday-lists'),
  api.get('/api/v1/salary-components'),
]);
```

Map each to `{ value: item.id, label: item.name }` for use in select components.

For `reportingManagerId`, combine `firstName + lastName` for the label.

---

## State Management Examples

### React Query + Axios

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Dropdown data hooks
export function useLegalEntities() {
  return useQuery({
    queryKey: ['legal-entities'],
    queryFn: () => api.get('/api/v1/legal-entities').then(r => r.data.data),
  });
}

export function useBusinessUnits() {
  return useQuery({
    queryKey: ['business-units'],
    queryFn: () => api.get('/api/v1/business-units').then(r => r.data.data),
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/api/v1/locations').then(r => r.data.data),
  });
}

export function useHolidayLists() {
  return useQuery({
    queryKey: ['holiday-lists'],
    queryFn: () => api.get('/api/v1/holiday-lists').then(r => r.data.data),
  });
}

export function useSalaryComponents() {
  return useQuery({
    queryKey: ['salary-components'],
    queryFn: () => api.get('/api/v1/salary-components').then(r => r.data.data),
  });
}

// Onboarding mutation
export function useOnboardEmployee() {
  return useMutation({
    mutationFn: (data: OnboardEmployeePayload) =>
      api.post('/api/v1/employee-onboarding', data).then(r => r.data),
    onSuccess: data => {
      // Navigate to employee detail or list
      // Invalidate relevant queries
    },
  });
}
```

### Wizard State (React)

```typescript
import { useState } from 'react';

interface WizardState {
  basicDetails: BasicDetailsForm;
  jobDetails: JobDetailsForm;
  moreDetails: MoreDetailsForm;
  compensation: CompensationForm;
}

function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<WizardState>>({});
  const { mutate, isPending } = useOnboardEmployee();

  const updateStep = (stepKey: keyof WizardState, data: any) => {
    setFormData((prev) => ({ ...prev, [stepKey]: data }));
  };

  const handleSubmit = () => {
    mutate(formData as OnboardEmployeePayload);
  };

  const steps = [
    { title: 'Basic Details', key: 'basicDetails' },
    { title: 'Job Details', key: 'jobDetails' },
    { title: 'More Details', key: 'moreDetails' },
    { title: 'Compensation', key: 'compensation' },
  ];

  return (
    <div>
      <StepIndicator steps={steps} currentStep={step} />
      {step === 0 && <BasicDetailsForm onNext={(d) => { updateStep('basicDetails', d); setStep(1); }} />}
      {step === 1 && <JobDetailsForm onNext={(d) => { updateStep('jobDetails', d); setStep(2); }} onBack={() => setStep(0)} />}
      {step === 2 && <MoreDetailsForm onNext={(d) => { updateStep('moreDetails', d); setStep(3); }} onBack={() => setStep(1)} />}
      {step === 3 && <CompensationForm onSubmit={(d) => { updateStep('compensation', d); handleSubmit(); }} onBack={() => setStep(2)} loading={isPending} />}
    </div>
  );
}
```

---

## Error Handling

### API Error Response Format

```json
{
  "statusCode": 400,
  "message": "An account with this email already exists"
}
```

or validation errors:

```json
{
  "statusCode": 400,
  "message": [
    "basicDetails.email must be an email",
    "basicDetails.firstName should not be empty"
  ],
  "error": "Bad Request"
}
```

### Frontend Error Handling

```typescript
const { mutate } = useOnboardEmployee();

mutate(formData, {
  onError: error => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;
      if (Array.isArray(message)) {
        // Validation errors — map to form fields
        message.forEach(msg => {
          // Parse field path: "basicDetails.email must be an email"
          const field = msg.split(' ')[0];
          setFieldError(field, msg);
        });
      } else {
        // Single error message
        toast.error(message || 'Failed to onboard employee');
      }
    }
  },
});
```

### Transaction Rollback

The onboarding API is fully transactional. If any step fails (e.g., invalid shift ID, duplicate email), the entire operation rolls back. The frontend does not need to handle partial failures — it's all-or-nothing.

Common error scenarios:

- `"An account with this email already exists"` — duplicate email
- `"Employee number "EMP-044" is already in use"` — duplicate employee number
- `"Shift with ID "..." not found or inactive"` — invalid shift reference
- `"Leave plan with ID "..." not found or inactive"` — invalid leave plan reference

---

## Existing APIs Referenced

These APIs were created in the previous feature implementation and are reused in the onboarding wizard dropdowns:

| Endpoint                  | Used For                           |
| ------------------------- | ---------------------------------- |
| `GET /api/v1/departments` | Department dropdown (Tab 2)        |
| `GET /api/v1/users`       | Reporting manager dropdown (Tab 2) |
| `GET /api/v1/shifts`      | Shift dropdown (Tab 3)             |
| `GET /api/v1/leave-plans` | Leave plan dropdown (Tab 3)        |

Refer to `docs/ADMIN_SHIFT_LEAVE_FRONTEND.md` for their full API contracts.
