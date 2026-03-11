# Holiday Management - Frontend Integration Guide

## Overview

This document covers the **Holiday Plan Management** feature for the HR admin panel, modeled after the Keka Holiday Plan UI. It enables HR to create and manage holiday plans (lists), add/edit/remove holidays, assign plans to employees, and **import public holidays from a country-specific database** (powered by the Nager.Date API).

All endpoints require HR authentication (`Authorization: Bearer <jwt>`) and `hr` role unless noted otherwise. Employee-facing endpoints (view own holidays) are accessible to both `employee` and `hr` roles.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication Context](#authentication-context)
3. [Holiday Plan Management (HR)](#holiday-plan-management-hr)
   - [List All Holiday Plans](#list-all-holiday-plans)
   - [Create Holiday Plan](#create-holiday-plan)
   - [Get Holiday Plan Detail](#get-holiday-plan-detail)
   - [Update Holiday Plan](#update-holiday-plan)
   - [Delete Holiday Plan](#delete-holiday-plan)
4. [Holiday CRUD Within a Plan](#holiday-crud-within-a-plan)
   - [Add Holiday](#add-holiday)
   - [Update Holiday](#update-holiday)
   - [Remove Holiday](#remove-holiday)
   - [Bulk Add Holidays](#bulk-add-holidays)
5. [Import Holidays from Country (Nager.Date API)](#import-holidays-from-country)
   - [Get Available Countries](#get-available-countries)
   - [Preview Public Holidays for Country](#preview-public-holidays-for-country)
   - [Import Selected Holidays](#import-selected-holidays)
6. [Plan Employee Assignment](#plan-employee-assignment)
   - [Get Employees in Plan](#get-employees-in-plan)
   - [Get Unassigned Employees](#get-unassigned-employees)
   - [Assign Employees to Plan](#assign-employees-to-plan)
   - [Unassign Employees from Plan](#unassign-employees-from-plan)
7. [Employee View (Self-Service)](#employee-view-self-service)
   - [Get My Holidays](#get-my-holidays)
   - [Get My Holiday Plan](#get-my-holiday-plan)
   - [Get Upcoming Holidays](#get-upcoming-holidays)
   - [Get Holiday Calendar](#get-holiday-calendar)
8. [Frontend Routing](#frontend-routing)
9. [Component Hierarchy](#component-hierarchy)
10. [Page Layout & Wireframes](#page-layout--wireframes)
11. [State Management](#state-management)
12. [Form Validation Rules](#form-validation-rules)
13. [Error Handling](#error-handling)
14. [API Summary Table](#api-summary-table)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Holiday Plan Management (HR)                       │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐ │
│  │  Sidebar          │  │  Main Content                           │ │
│  │                   │  │                                         │ │
│  │  🔍 Search        │  │  Plan Name          62 Employees       │ │
│  │                   │  │                                         │ │
│  │  ┌─────────────┐ │  │  [2024] [2025] [2026] [2027]           │ │
│  │  │ PB-IN       │ │  │                                         │ │
│  │  │ 62 employees│ │  │  + Add Holiday  |  Import from Country  │ │
│  │  │ DEFAULT     │ │  │                                         │ │
│  │  └─────────────┘ │  │  ┌──────────────────────────────────┐  │ │
│  │                   │  │  │ HOLIDAY NAME  DATE  OPTIONAL  SP │  │ │
│  │  ┌─────────────┐ │  │  │──────────────────────────────────│  │ │
│  │  │ US Holidays │ │  │  │ Republic Day  26 Jan  No     No  │  │ │
│  │  │ 5 employees │ │  │  │ Holi          04 Mar  No     No  │  │ │
│  │  └─────────────┘ │  │  │ Independence  15 Aug  No     No  │  │ │
│  │                   │  │  │ Christmas     25 Dec  No     No  │  │ │
│  │  + New Plan       │  │  └──────────────────────────────────┘  │ │
│  └──────────────────┘  └──────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Modals: Add Holiday | Edit Holiday | Import from Country    │   │
│  │          Delete Plan Confirm | Create New Plan               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**

```
HR Dashboard
    │
    ├── GET /api/v1/holiday-lists?year=2026
    │   └── Returns all plans with employee counts
    │
    ├── SELECT plan from sidebar
    │   └── GET /api/v1/holiday-lists/:id
    │       └── Returns plan detail with all holidays
    │
    ├── Add / Edit / Remove holidays
    │   └── POST / PATCH / DELETE on holiday sub-resources
    │
    └── Import from Country
        ├── GET /api/v1/holiday-lists/public-holidays/countries
        ├── GET /api/v1/holiday-lists/public-holidays/:countryCode/:year
        └── POST /api/v1/holiday-lists/:listId/holidays/import
```

---

## Authentication Context

All HR endpoints require JWT authentication with the `hr` role.

```
Authorization: Bearer <access_token>
```

The employee self-service endpoint (`GET /api/v1/holidays`) works for both `employee` and `hr` roles.

---

## Holiday Plan Management (HR)

### List All Holiday Plans

Returns all holiday plans, optionally filtered by year. Each plan includes the count of assigned employees and holidays.

| Method | Endpoint                | Auth    |
| ------ | ----------------------- | ------- |
| GET    | `/api/v1/holiday-lists` | HR only |

**Query Parameters:**

| Param  | Type   | Required | Default   | Description    |
| ------ | ------ | -------- | --------- | -------------- |
| `year` | number | No       | All years | Filter by year |

**Request:**

```
GET /api/v1/holiday-lists?year=2026
```

**Response:**

```json
{
  "success": true,
  "message": "Holiday lists retrieved",
  "data": [
    {
      "id": "uuid-1",
      "name": "PB-IN",
      "year": 2026,
      "description": "India public holidays",
      "isActive": true,
      "isDefault": true,
      "employeeCount": 62,
      "holidayCount": 9,
      "createdAt": "2025-12-01T10:00:00.000Z",
      "updatedAt": "2026-01-05T08:30:00.000Z"
    },
    {
      "id": "uuid-2",
      "name": "US Holidays",
      "year": 2026,
      "description": "United States federal holidays",
      "isActive": true,
      "isDefault": false,
      "employeeCount": 5,
      "holidayCount": 11,
      "createdAt": "2025-12-01T10:30:00.000Z",
      "updatedAt": "2026-01-05T08:30:00.000Z"
    }
  ]
}
```

**Sidebar rendering:** Display each plan as a card showing `name`, `employeeCount`, and a "DEFAULT" badge if `isDefault === true`.

---

### Create Holiday Plan

Creates a new holiday plan. If `isDefault` is `true`, the backend automatically unsets any existing default for that year.

| Method | Endpoint                | Auth    |
| ------ | ----------------------- | ------- |
| POST   | `/api/v1/holiday-lists` | HR only |

**Request:**

```json
{
  "name": "PB-IN",
  "year": 2026,
  "description": "India public holidays",
  "isDefault": true
}
```

| Field         | Type    | Required | Default | Description                   |
| ------------- | ------- | -------- | ------- | ----------------------------- |
| `name`        | string  | Yes      | -       | Plan name (2-255 chars)       |
| `year`        | number  | Yes      | -       | Year (2000-2100)              |
| `description` | string  | No       | null    | Optional description          |
| `isDefault`   | boolean | No       | false   | Mark as default for this year |

**Response (201):**

```json
{
  "success": true,
  "message": "Holiday list created",
  "data": {
    "id": "uuid",
    "name": "PB-IN",
    "year": 2026,
    "description": "India public holidays",
    "isActive": true,
    "isDefault": true,
    "createdAt": "2026-03-10T10:00:00.000Z",
    "updatedAt": "2026-03-10T10:00:00.000Z"
  }
}
```

---

### Get Holiday Plan Detail

Returns a single holiday plan with all its holidays. Use this when a plan is selected in the sidebar.

| Method | Endpoint                    | Auth    |
| ------ | --------------------------- | ------- |
| GET    | `/api/v1/holiday-lists/:id` | HR only |

**Response:**

```json
{
  "success": true,
  "message": "Holiday list retrieved",
  "data": {
    "id": "uuid-1",
    "name": "PB-IN",
    "year": 2026,
    "description": "India public holidays",
    "isActive": true,
    "isDefault": true,
    "holidays": [
      {
        "id": "h-uuid-1",
        "name": "New Year's Day",
        "date": "2026-01-01",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      },
      {
        "id": "h-uuid-2",
        "name": "Makar Sankranti",
        "date": "2026-01-14",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      },
      {
        "id": "h-uuid-3",
        "name": "Republic Day",
        "date": "2026-01-26",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      },
      {
        "id": "h-uuid-4",
        "name": "Holi",
        "date": "2026-03-04",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      },
      {
        "id": "h-uuid-5",
        "name": "Independence Day",
        "date": "2026-08-15",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      },
      {
        "id": "h-uuid-6",
        "name": "Mahatma Gandhi Jayanti",
        "date": "2026-10-03",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      },
      {
        "id": "h-uuid-7",
        "name": "Diwali/Deepavali",
        "date": "2026-11-03",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      },
      {
        "id": "h-uuid-8",
        "name": "Guru Nanak Jayanti",
        "date": "2026-11-24",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      },
      {
        "id": "h-uuid-9",
        "name": "Christmas",
        "date": "2026-12-25",
        "isOptional": false,
        "isSpecial": false,
        "createdAt": "2025-12-01T10:00:00.000Z"
      }
    ],
    "createdAt": "2025-12-01T10:00:00.000Z",
    "updatedAt": "2026-01-05T08:30:00.000Z"
  }
}
```

**Holiday table columns:**

| Column       | Source               | Display                                          |
| ------------ | -------------------- | ------------------------------------------------ |
| HOLIDAY NAME | `holiday.name`       | Text                                             |
| DATE         | `holiday.date`       | Formatted as "DD MMM YYYY" (e.g., "26 Jan 2026") |
| OPTIONAL     | `holiday.isOptional` | "Yes" / "No"                                     |
| SPECIAL      | `holiday.isSpecial`  | "Yes" / "No"                                     |

---

### Update Holiday Plan

| Method | Endpoint                    | Auth    |
| ------ | --------------------------- | ------- |
| PATCH  | `/api/v1/holiday-lists/:id` | HR only |

**Request:**

```json
{
  "name": "India Holidays - Updated",
  "isDefault": true
}
```

All fields are optional. If `isDefault` is set to `true`, the backend unsets any existing default for the same year.

**Response:** Same structure as Create, with updated values.

---

### Delete Holiday Plan

Permanently deletes a holiday plan. All holidays in the plan are cascade-deleted. All employees assigned to this plan are automatically unassigned (`holidayListId` set to `null`).

| Method | Endpoint                    | Auth    |
| ------ | --------------------------- | ------- |
| DELETE | `/api/v1/holiday-lists/:id` | HR only |

**Response:**

```json
{
  "success": true,
  "message": "Holiday list deleted",
  "data": null
}
```

**Important:** This is a permanent delete, not a soft delete. Show a strong confirmation dialog.

**Confirmation Dialog:**

```
┌─────────────────────────────────────────────────┐
│  Delete Holiday Plan                             │
│                                                  │
│  Are you sure you want to permanently delete     │
│  "PB-IN"?                                        │
│                                                  │
│  - All holidays in this plan will be removed     │
│  - 62 employees will be unassigned from this     │
│    plan and will need to be reassigned           │
│                                                  │
│  This action cannot be undone.                   │
│                                                  │
│                      [Cancel]  [Delete]          │
└─────────────────────────────────────────────────┘
```

---

## Holiday CRUD Within a Plan

### Add Holiday

Adds a single holiday to a plan. The backend enforces unique dates per plan.

| Method | Endpoint                                 | Auth    |
| ------ | ---------------------------------------- | ------- |
| POST   | `/api/v1/holiday-lists/:listId/holidays` | HR only |

**Request:**

```json
{
  "name": "Republic Day",
  "date": "2026-01-26",
  "isOptional": false,
  "isSpecial": false
}
```

| Field        | Type    | Required | Default | Description                           |
| ------------ | ------- | -------- | ------- | ------------------------------------- |
| `name`       | string  | Yes      | -       | Holiday name (2-255 chars)            |
| `date`       | string  | Yes      | -       | Date in YYYY-MM-DD format             |
| `isOptional` | boolean | No       | false   | Is this an optional holiday?          |
| `isSpecial`  | boolean | No       | false   | Is this a special/restricted holiday? |

**Response (201):**

```json
{
  "success": true,
  "message": "Holiday added",
  "data": {
    "id": "uuid",
    "holidayListId": "list-uuid",
    "name": "Republic Day",
    "date": "2026-01-26",
    "isOptional": false,
    "isSpecial": false,
    "createdAt": "2026-03-10T10:00:00.000Z"
  }
}
```

**Errors:**

| Status | Condition                       | Response                                              |
| ------ | ------------------------------- | ----------------------------------------------------- |
| 400    | Duplicate date in the same plan | `A holiday already exists on 2026-01-26 in this list` |
| 404    | Plan not found                  | `Holiday list with ID "..." not found`                |

**Add Holiday Modal:**

```
┌─────────────────────────────────────────────────┐
│  Add Holiday                                     │
│                                                  │
│  Holiday Name *                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ Republic Day                             │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Date *                                          │
│  ┌─────────────────────────────────────────┐    │
│  │ 2026-01-26                    📅         │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ☐ Optional Holiday                              │
│  ☐ Special Holiday                               │
│                                                  │
│                       [Cancel]  [Add Holiday]    │
└─────────────────────────────────────────────────┘
```

---

### Update Holiday

| Method | Endpoint                                            | Auth    |
| ------ | --------------------------------------------------- | ------- |
| PATCH  | `/api/v1/holiday-lists/:listId/holidays/:holidayId` | HR only |

**Request:**

```json
{
  "name": "Republic Day (National)",
  "isOptional": false,
  "isSpecial": true
}
```

All fields are optional (partial update).

**Response:**

```json
{
  "success": true,
  "message": "Holiday updated",
  "data": {
    "id": "uuid",
    "holidayListId": "list-uuid",
    "name": "Republic Day (National)",
    "date": "2026-01-26",
    "isOptional": false,
    "isSpecial": true,
    "createdAt": "2026-03-10T10:00:00.000Z"
  }
}
```

---

### Remove Holiday

| Method | Endpoint                                            | Auth    |
| ------ | --------------------------------------------------- | ------- |
| DELETE | `/api/v1/holiday-lists/:listId/holidays/:holidayId` | HR only |

**Response:**

```json
{
  "success": true,
  "message": "Holiday removed",
  "data": null
}
```

---

### Bulk Add Holidays

Adds multiple holidays to a plan at once. Useful when manually entering a full year of holidays. Holidays with dates that already exist in the plan are skipped.

| Method | Endpoint                                      | Auth    |
| ------ | --------------------------------------------- | ------- |
| POST   | `/api/v1/holiday-lists/:listId/holidays/bulk` | HR only |

**Request:**

```json
{
  "holidays": [
    {
      "name": "New Year's Day",
      "date": "2026-01-01",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "name": "Republic Day",
      "date": "2026-01-26",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "name": "Holi",
      "date": "2026-03-04",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "name": "Independence Day",
      "date": "2026-08-15",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "name": "Christmas",
      "date": "2026-12-25",
      "isOptional": false,
      "isSpecial": false
    }
  ]
}
```

| Field                   | Type    | Required | Description                |
| ----------------------- | ------- | -------- | -------------------------- |
| `holidays`              | array   | Yes      | Array of holiday objects   |
| `holidays[].name`       | string  | Yes      | Holiday name (2-255 chars) |
| `holidays[].date`       | string  | Yes      | Date in YYYY-MM-DD format  |
| `holidays[].isOptional` | boolean | No       | Default: false             |
| `holidays[].isSpecial`  | boolean | No       | Default: false             |

**Response (201):**

```json
{
  "success": true,
  "message": "5 holidays added, 0 skipped (duplicate dates)",
  "data": {
    "added": 5,
    "skipped": 0,
    "holidays": [
      {
        "id": "uuid-1",
        "name": "New Year's Day",
        "date": "2026-01-01",
        "isOptional": false,
        "isSpecial": false
      },
      {
        "id": "uuid-2",
        "name": "Republic Day",
        "date": "2026-01-26",
        "isOptional": false,
        "isSpecial": false
      },
      {
        "id": "uuid-3",
        "name": "Holi",
        "date": "2026-03-04",
        "isOptional": false,
        "isSpecial": false
      },
      {
        "id": "uuid-4",
        "name": "Independence Day",
        "date": "2026-08-15",
        "isOptional": false,
        "isSpecial": false
      },
      {
        "id": "uuid-5",
        "name": "Christmas",
        "date": "2026-12-25",
        "isOptional": false,
        "isSpecial": false
      }
    ]
  }
}
```

---

## Import Holidays from Country

This feature allows HR to import public holidays from the **Nager.Date API** (120+ countries) and **built-in static data** (India and other countries not covered by Nager.Date). HR selects a country, previews the holidays, picks the ones to import, and they are added to the plan.

**Country Sources:**

| Source               | Countries      | Notes                                                 |
| -------------------- | -------------- | ----------------------------------------------------- |
| Built-in static data | India (`IN`)   | Includes all gazetted holidays with Hindi local names |
| Nager.Date API v3    | 120+ countries | Cached for 1 hour, graceful fallback on failure       |

The country dropdown merges both sources alphabetically. India appears as a standard entry.

### Import Flow

```
1. HR clicks "Import from Country" button
     │
2. GET /api/v1/holiday-lists/public-holidays/countries
     │ → Populate country dropdown
     │
3. HR selects country (e.g., "India") and year (e.g., 2026)
     │
4. GET /api/v1/holiday-lists/public-holidays/IN/2026
     │ → Show preview table with checkboxes
     │
5. HR checks/unchecks holidays to import
     │
6. HR clicks "Import Selected"
     │
7. POST /api/v1/holiday-lists/:listId/holidays/import
     │ → Backend adds selected holidays, skips duplicates
     │
8. Refresh holiday list table
```

---

### Get Available Countries

Returns the list of countries supported by the public holidays API.

| Method | Endpoint                                          | Auth    |
| ------ | ------------------------------------------------- | ------- |
| GET    | `/api/v1/holiday-lists/public-holidays/countries` | HR only |

**Response:**

```json
{
  "success": true,
  "message": "Available countries retrieved",
  "data": [
    { "countryCode": "AT", "name": "Austria" },
    { "countryCode": "AU", "name": "Australia" },
    { "countryCode": "BR", "name": "Brazil" },
    { "countryCode": "CA", "name": "Canada" },
    { "countryCode": "CN", "name": "China" },
    { "countryCode": "DE", "name": "Germany" },
    { "countryCode": "FR", "name": "France" },
    { "countryCode": "GB", "name": "United Kingdom" },
    { "countryCode": "IN", "name": "India" },
    { "countryCode": "JP", "name": "Japan" },
    { "countryCode": "US", "name": "United States" }
  ]
}
```

India (`IN`) is always present in the list -- it comes from built-in static data, not the external API. The list is sorted alphabetically.

**Frontend:** Render as a searchable dropdown/select. The backend caches this for 1 hour, so the frontend can also cache safely.

---

### Preview Public Holidays for Country

Fetches public holidays for a specific country and year from the Nager.Date API and returns them in the application's format.

| Method | Endpoint                                                   | Auth    |
| ------ | ---------------------------------------------------------- | ------- |
| GET    | `/api/v1/holiday-lists/public-holidays/:countryCode/:year` | HR only |

**Path Parameters:**

| Param         | Type   | Description                                      |
| ------------- | ------ | ------------------------------------------------ |
| `countryCode` | string | ISO 3166-1 alpha-2 code (e.g., "IN", "US", "GB") |
| `year`        | number | Year (e.g., 2026)                                |

**Request:**

```
GET /api/v1/holiday-lists/public-holidays/IN/2026
```

**Response:**

```json
{
  "success": true,
  "message": "Public holidays for IN 2026 retrieved",
  "data": [
    {
      "name": "Republic Day",
      "localName": "गणतन्त्र दिवस",
      "date": "2026-01-26",
      "isOptional": false,
      "isSpecial": false,
      "types": ["Public"],
      "isGlobal": true
    },
    {
      "name": "Maha Shivaratri",
      "localName": "महा शिवरात्रि",
      "date": "2026-02-26",
      "isOptional": false,
      "isSpecial": false,
      "types": ["Public"],
      "isGlobal": true
    },
    {
      "name": "Holi",
      "localName": "होली",
      "date": "2026-03-14",
      "isOptional": false,
      "isSpecial": false,
      "types": ["Public"],
      "isGlobal": true
    },
    {
      "name": "Dr. Ambedkar Jayanti",
      "localName": "डॉ. अम्बेडकर जयन्ती",
      "date": "2026-04-14",
      "isOptional": false,
      "isSpecial": false,
      "types": ["Public"],
      "isGlobal": true
    },
    {
      "name": "Independence Day",
      "localName": "स्वतन्त्रता दिवस",
      "date": "2026-08-15",
      "isOptional": false,
      "isSpecial": false,
      "types": ["Public"],
      "isGlobal": true
    },
    {
      "name": "Mahatma Gandhi Jayanti",
      "localName": "महात्मा गांधी जयन्ती",
      "date": "2026-10-02",
      "isOptional": false,
      "isSpecial": false,
      "types": ["Public"],
      "isGlobal": true
    },
    {
      "name": "Diwali",
      "localName": "दीपावली",
      "date": "2026-10-20",
      "isOptional": false,
      "isSpecial": false,
      "types": ["Public"],
      "isGlobal": true
    },
    {
      "name": "Christmas",
      "localName": "क्रिसमस",
      "date": "2026-12-25",
      "isOptional": false,
      "isSpecial": false,
      "types": ["Public"],
      "isGlobal": true
    }
  ]
}
```

India holidays come from built-in static data (19 gazetted holidays). The `localName` field contains the Hindi name. Only a subset is shown above -- the full list includes Holi, Good Friday, Eid, Ram Navami, Mahavir Jayanti, Buddha Purnima, Bakrid, Muharram, Milad-un-Nabi, Dussehra, Guru Nanak Jayanti, and more.

**Type Mapping from Nager.Date:**

| Nager.Date `types`               | `isOptional` | `isSpecial` |
| -------------------------------- | ------------ | ----------- |
| `["Public"]`                     | false        | false       |
| `["Optional"]`                   | true         | false       |
| `["Bank"]` or `["Authorities"]`  | false        | true        |
| `["School"]` or `["Observance"]` | true         | false       |

**Errors:**

| Status | Condition                  | Response                                             |
| ------ | -------------------------- | ---------------------------------------------------- |
| 400    | Invalid country code       | `Country code "XX" is not supported`                 |
| 502    | Nager.Date API unreachable | `Public holidays service is temporarily unavailable` |

---

### Import Selected Holidays

Imports selected public holidays into a holiday plan. HR can choose which holidays to import after previewing.

| Method | Endpoint                                        | Auth    |
| ------ | ----------------------------------------------- | ------- |
| POST   | `/api/v1/holiday-lists/:listId/holidays/import` | HR only |

**Request:**

```json
{
  "countryCode": "IN",
  "year": 2026,
  "selectedHolidays": [
    { "name": "Republic Day", "date": "2026-01-26" },
    { "name": "Independence Day", "date": "2026-08-15" },
    { "name": "Mahatma Gandhi Jayanti", "date": "2026-10-02" },
    { "name": "Christmas Day", "date": "2026-12-25" }
  ]
}
```

| Field                     | Type   | Required | Description                                                                                     |
| ------------------------- | ------ | -------- | ----------------------------------------------------------------------------------------------- |
| `countryCode`             | string | Yes      | ISO country code used to fetch holidays                                                         |
| `year`                    | number | Yes      | Year for which holidays were fetched                                                            |
| `selectedHolidays`        | array  | No       | Specific holidays to import. If omitted, all public holidays for the country/year are imported. |
| `selectedHolidays[].name` | string | Yes      | Holiday name                                                                                    |
| `selectedHolidays[].date` | string | Yes      | Holiday date (YYYY-MM-DD)                                                                       |

**Response (201):**

```json
{
  "success": true,
  "message": "4 holidays imported, 0 skipped (duplicate dates)",
  "data": {
    "added": 4,
    "skipped": 0,
    "holidays": [
      {
        "id": "uuid-1",
        "name": "Republic Day",
        "date": "2026-01-26",
        "isOptional": false,
        "isSpecial": false
      },
      {
        "id": "uuid-2",
        "name": "Independence Day",
        "date": "2026-08-15",
        "isOptional": false,
        "isSpecial": false
      },
      {
        "id": "uuid-3",
        "name": "Mahatma Gandhi Jayanti",
        "date": "2026-10-02",
        "isOptional": false,
        "isSpecial": false
      },
      {
        "id": "uuid-4",
        "name": "Christmas Day",
        "date": "2026-12-25",
        "isOptional": false,
        "isSpecial": false
      }
    ]
  }
}
```

**Import Holidays Modal:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Import Public Holidays                                          │
│                                                                  │
│  Country *                              Year *                   │
│  ┌──────────────────────────┐          ┌──────────────┐         │
│  │ India                  ▼ │          │ 2026       ▼ │         │
│  └──────────────────────────┘          └──────────────┘         │
│                                                                  │
│  [Load Holidays]                                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ☑  Select All                                            │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ ☑  Republic Day              26 Jan 2026    Public       │   │
│  │ ☑  Independence Day          15 Aug 2026    Public       │   │
│  │ ☑  Mahatma Gandhi Jayanti    02 Oct 2026    Public       │   │
│  │ ☐  Milad-un-Nabi             08 Oct 2026    Optional     │   │
│  │ ☑  Diwali                    21 Oct 2026    Public       │   │
│  │ ☑  Christmas Day             25 Dec 2026    Public       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  4 of 6 holidays selected                                        │
│                                                                  │
│                          [Cancel]  [Import Selected]             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Plan Employee Assignment

HR can manage employee assignments directly from the holiday plan detail page. The flow supports viewing assigned employees, assigning new employees via a searchable picker, and unassigning employees.

### Assignment Flow

```
1. HR views a holiday plan → clicks "Employees" tab
     │
2. GET /api/v1/holiday-lists/:listId/employees
     │ → Show assigned employees table
     │
3. HR clicks "Assign Employees" button
     │
4. GET /api/v1/holiday-lists/:listId/employees/unassigned?search=
     │ → Show searchable employee picker with checkboxes
     │
5. HR selects employees, clicks "Assign"
     │
6. POST /api/v1/holiday-lists/:listId/employees/assign
     │ → Bulk assign selected employees
     │
7. Refresh assigned employees table + sidebar employee count
```

---

### Get Employees in Plan

Returns the list of employees assigned to a specific holiday plan.

| Method | Endpoint                                  | Auth    |
| ------ | ----------------------------------------- | ------- |
| GET    | `/api/v1/holiday-lists/:listId/employees` | HR only |

**Response:**

```json
{
  "success": true,
  "message": "Employees in holiday list retrieved",
  "data": [
    {
      "id": "profile-uuid-1",
      "userId": "user-uuid-1",
      "employeeNumber": "EMP-001",
      "displayName": "John Doe",
      "user": {
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    },
    {
      "id": "profile-uuid-2",
      "userId": "user-uuid-2",
      "employeeNumber": "EMP-002",
      "displayName": "Jane Smith",
      "user": {
        "email": "jane@example.com",
        "firstName": "Jane",
        "lastName": "Smith"
      }
    }
  ]
}
```

---

### Get Unassigned Employees

Returns employees **not** currently assigned to this plan. Supports optional search by name, email, or employee number. Used to populate the employee picker in the assign modal.

| Method | Endpoint                                             | Auth    |
| ------ | ---------------------------------------------------- | ------- |
| GET    | `/api/v1/holiday-lists/:listId/employees/unassigned` | HR only |

**Query Parameters:**

| Param    | Type   | Required | Default | Description                               |
| -------- | ------ | -------- | ------- | ----------------------------------------- |
| `search` | string | No       | -       | Filter by name, email, or employee number |

**Request:**

```
GET /api/v1/holiday-lists/uuid-1/employees/unassigned?search=john
```

**Response:**

```json
{
  "success": true,
  "message": "Unassigned employees retrieved",
  "data": [
    {
      "id": "profile-uuid-3",
      "userId": "user-uuid-3",
      "employeeNumber": "EMP-003",
      "displayName": "John Williams",
      "user": {
        "email": "john.w@example.com",
        "firstName": "John",
        "lastName": "Williams"
      }
    },
    {
      "id": "profile-uuid-4",
      "userId": "user-uuid-4",
      "employeeNumber": "EMP-004",
      "displayName": "Johnny Rogers",
      "user": {
        "email": "johnny.r@example.com",
        "firstName": "Johnny",
        "lastName": "Rogers"
      }
    }
  ]
}
```

---

### Assign Employees to Plan

Bulk assigns employees to a holiday plan. Sets `holidayListId` on each employee profile. The plan must be active.

| Method | Endpoint                                         | Auth    |
| ------ | ------------------------------------------------ | ------- |
| POST   | `/api/v1/holiday-lists/:listId/employees/assign` | HR only |

**Request:**

```json
{
  "employeeIds": ["user-uuid-3", "user-uuid-4", "user-uuid-5"]
}
```

| Field         | Type     | Required | Description                      |
| ------------- | -------- | -------- | -------------------------------- |
| `employeeIds` | string[] | Yes      | Array of user UUIDs (at least 1) |

**Response (200):**

```json
{
  "success": true,
  "message": "3 employees assigned to holiday plan",
  "data": {
    "assigned": 3
  }
}
```

**Errors:**

| Status | Condition                     | Response                                           |
| ------ | ----------------------------- | -------------------------------------------------- |
| 404    | Plan not found or inactive    | `Holiday list with ID "..." not found or inactive` |
| 400    | No matching employee profiles | `No employee profiles found for the provided IDs`  |

---

### Unassign Employees from Plan

Removes employees from a holiday plan. Sets `holidayListId = null` only for employees currently assigned to this specific plan.

| Method | Endpoint                                           | Auth    |
| ------ | -------------------------------------------------- | ------- |
| POST   | `/api/v1/holiday-lists/:listId/employees/unassign` | HR only |

**Request:**

```json
{
  "employeeIds": ["user-uuid-1"]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "1 employees unassigned from holiday plan",
  "data": {
    "unassigned": 1
  }
}
```

---

### Employees Tab Wireframe

The plan detail page includes an "Employees" tab alongside the holiday table. When selected, it shows the assigned employee list with an assign button.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PB-IN                                            62 Employees         │
│                                                                         │
│  ┌──────────┬──────────────┐                                           │
│  │ Holidays │ Employees *  │                                           │
│  └──────────┴──────────────┘                                           │
│                                                                         │
│  [+ Assign Employees]                                                   │
│                                                                         │
│  ┌──────────────┬──────────────────┬─────────────┬─────────┐          │
│  │ EMP. NUMBER  │ NAME             │ EMAIL       │ ACTION  │          │
│  ├──────────────┼──────────────────┼─────────────┼─────────┤          │
│  │ EMP-001      │ John Doe         │ john@...    │ Remove  │          │
│  │ EMP-002      │ Jane Smith       │ jane@...    │ Remove  │          │
│  │ EMP-003      │ Mike Johnson     │ mike@...    │ Remove  │          │
│  │ ...          │ ...              │ ...         │ ...     │          │
│  └──────────────┴──────────────────┴─────────────┴─────────┘          │
│                                                                         │
│  Showing 62 employees                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Assign Employees Modal

When HR clicks "+ Assign Employees", a modal opens with a searchable list of unassigned employees.

```
┌──────────────────────────────────────────────────────────────────┐
│  Assign Employees to "PB-IN"                                     │
│                                                                  │
│  🔍 Search employees...                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │ ☑  Select All                                            │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ ☑  EMP-003  John Williams     john.w@example.com         │   │
│  │ ☑  EMP-004  Johnny Rogers     johnny.r@example.com       │   │
│  │ ☐  EMP-005  Sarah Chen        sarah.c@example.com        │   │
│  │ ☐  EMP-006  Alex Kumar        alex.k@example.com         │   │
│  │ ☐  EMP-007  Maria Garcia      maria.g@example.com        │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  2 employees selected                                            │
│                                                                  │
│                         [Cancel]  [Assign Selected]              │
└──────────────────────────────────────────────────────────────────┘
```

### Unassign Confirmation

When HR clicks "Remove" on an employee row, show a confirmation:

```
┌─────────────────────────────────────────────────┐
│  Remove Employee                                 │
│                                                  │
│  Are you sure you want to remove "John Doe"      │
│  from the holiday plan "PB-IN"?                  │
│                                                  │
│  They will fall back to the default plan.        │
│                                                  │
│                      [Cancel]  [Remove]          │
└─────────────────────────────────────────────────┘
```

### Alternative Assignment Methods

Employee assignment can also be done via:

- **Profile Update**: `PATCH /api/v1/employee-profiles/:userId` with `{ "holidayListId": "uuid" }`
- **Onboarding**: Set `holidayListId` in `moreDetails` during employee onboarding

#### Holiday Plan Dropdown in Onboarding

When building the onboarding form (Step 3 / More Details), populate the holiday plan dropdown by calling:

| Method | Endpoint                | Auth    |
| ------ | ----------------------- | ------- |
| GET    | `/api/v1/holiday-lists` | HR only |

**Query Parameters:**

| Param  | Type   | Required | Description                        |
| ------ | ------ | -------- | ---------------------------------- |
| `year` | number | No       | Filter by year (e.g. current year) |

Use the `id` field from each returned item as the value and `name` as the label for the dropdown. This is the same endpoint used on the Holiday Plan Management page. Pass the selected `id` as `moreDetails.holidayListId` in the onboarding payload.

**Example fetch for the dropdown:**

```typescript
const response = await api.get('/api/v1/holiday-lists', {
  params: { year: new Date().getFullYear() },
});
// response.data.data → [{ id, name, year, ... }]
```

---

## Employee View (Self-Service)

### Get My Holidays

Returns holidays for the current employee for a given year. The backend resolves the correct holiday plan: first checks the employee's assigned `holidayListId`, then falls back to the default active plan for the year.

| Method | Endpoint           | Auth                   |
| ------ | ------------------ | ---------------------- |
| GET    | `/api/v1/holidays` | Any authenticated user |

**Query Parameters:**

| Param  | Type   | Required | Default      | Description                |
| ------ | ------ | -------- | ------------ | -------------------------- |
| `year` | number | No       | Current year | Year to fetch holidays for |

**Request:**

```
GET /api/v1/holidays?year=2026
```

**Response:**

```json
{
  "success": true,
  "message": "Holidays retrieved",
  "data": [
    {
      "id": "uuid-1",
      "name": "New Year's Day",
      "date": "2026-01-01",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-2",
      "name": "Makar Sankranti",
      "date": "2026-01-14",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-3",
      "name": "Republic Day",
      "date": "2026-01-26",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-4",
      "name": "Holi",
      "date": "2026-03-04",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-5",
      "name": "Independence Day",
      "date": "2026-08-15",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-6",
      "name": "Mahatma Gandhi Jayanti",
      "date": "2026-10-03",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-7",
      "name": "Diwali/Deepavali",
      "date": "2026-11-03",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-8",
      "name": "Guru Nanak Jayanti",
      "date": "2026-11-24",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-9",
      "name": "Christmas",
      "date": "2026-12-25",
      "isOptional": false,
      "isSpecial": false
    }
  ]
}
```

**No holidays response:**

```json
{
  "success": true,
  "message": "No holiday list found for the given year",
  "data": []
}
```

---

### Get My Holiday Plan

Returns the current employee's assigned holiday plan details (name, year, holiday count). Returns `null` if no plan is assigned.

| Method | Endpoint                | Auth                   |
| ------ | ----------------------- | ---------------------- |
| GET    | `/api/v1/holidays/plan` | Any authenticated user |

**Response (plan assigned):**

```json
{
  "success": true,
  "message": "Holiday plan retrieved",
  "data": {
    "id": "uuid-1",
    "name": "PB-IN",
    "year": 2026,
    "description": "India public holidays",
    "holidayCount": 19
  }
}
```

**Response (no plan):**

```json
{
  "success": true,
  "message": "No holiday plan assigned",
  "data": null
}
```

**Frontend:** Display this in a card on the employee dashboard or holidays page header. Show plan name, year, and holiday count. If `data` is `null`, show a message like "No holiday plan assigned -- contact HR."

---

### Get Upcoming Holidays

Returns the next N upcoming holidays from today for the current employee. Useful for dashboard widgets.

| Method | Endpoint                    | Auth                   |
| ------ | --------------------------- | ---------------------- |
| GET    | `/api/v1/holidays/upcoming` | Any authenticated user |

**Query Parameters:**

| Param   | Type   | Required | Default | Description                           |
| ------- | ------ | -------- | ------- | ------------------------------------- |
| `limit` | number | No       | 5       | Number of upcoming holidays to return |

**Request:**

```
GET /api/v1/holidays/upcoming?limit=3
```

**Response:**

```json
{
  "success": true,
  "message": "Upcoming holidays retrieved",
  "data": [
    {
      "id": "uuid-1",
      "name": "Holi",
      "date": "2026-03-14",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-2",
      "name": "Good Friday",
      "date": "2026-03-29",
      "isOptional": false,
      "isSpecial": false
    },
    {
      "id": "uuid-3",
      "name": "Dr. Ambedkar Jayanti",
      "date": "2026-04-14",
      "isOptional": false,
      "isSpecial": false
    }
  ]
}
```

**Frontend:** Render as a compact list in the employee dashboard widget:

```
┌─────────────────────────────────────────────┐
│  Upcoming Holidays                           │
│                                              │
│  14 Mar 2026    Holi                         │
│  29 Mar 2026    Good Friday                  │
│  14 Apr 2026    Dr. Ambedkar Jayanti         │
│                                              │
│  View All Holidays →                         │
└─────────────────────────────────────────────┘
```

---

### Get Holiday Calendar

Returns holidays for the current employee grouped by month for calendar view rendering.

| Method | Endpoint                    | Auth                   |
| ------ | --------------------------- | ---------------------- |
| GET    | `/api/v1/holidays/calendar` | Any authenticated user |

**Query Parameters:**

| Param  | Type   | Required | Default      | Description                |
| ------ | ------ | -------- | ------------ | -------------------------- |
| `year` | number | No       | Current year | Year to fetch holidays for |

**Request:**

```
GET /api/v1/holidays/calendar?year=2026
```

**Response:**

```json
{
  "success": true,
  "message": "Holiday calendar retrieved",
  "data": {
    "year": 2026,
    "totalHolidays": 19,
    "months": {
      "2026-01": [
        {
          "id": "uuid-1",
          "name": "Republic Day",
          "date": "2026-01-26",
          "isOptional": false,
          "isSpecial": false
        }
      ],
      "2026-02": [
        {
          "id": "uuid-2",
          "name": "Maha Shivaratri",
          "date": "2026-02-26",
          "isOptional": false,
          "isSpecial": false
        }
      ],
      "2026-03": [
        {
          "id": "uuid-3",
          "name": "Holi",
          "date": "2026-03-14",
          "isOptional": false,
          "isSpecial": false
        },
        {
          "id": "uuid-4",
          "name": "Good Friday",
          "date": "2026-03-29",
          "isOptional": false,
          "isSpecial": false
        },
        {
          "id": "uuid-5",
          "name": "Id-ul-Fitr (Eid)",
          "date": "2026-03-31",
          "isOptional": false,
          "isSpecial": false
        }
      ],
      "2026-08": [
        {
          "id": "uuid-6",
          "name": "Independence Day",
          "date": "2026-08-15",
          "isOptional": false,
          "isSpecial": false
        }
      ],
      "2026-10": [
        {
          "id": "uuid-7",
          "name": "Mahatma Gandhi Jayanti",
          "date": "2026-10-02",
          "isOptional": false,
          "isSpecial": false
        },
        {
          "id": "uuid-8",
          "name": "Diwali",
          "date": "2026-10-20",
          "isOptional": false,
          "isSpecial": false
        }
      ],
      "2026-12": [
        {
          "id": "uuid-9",
          "name": "Christmas",
          "date": "2026-12-25",
          "isOptional": false,
          "isSpecial": false
        }
      ]
    }
  }
}
```

**Frontend:** Use this to render a month-by-month calendar or timeline view. The `months` object uses `YYYY-MM` keys. Only months with holidays are included.

**Calendar Page Wireframe:**

```
┌─────────────────────────────────────────────────────────────┐
│  Holiday Calendar 2026                    PB-IN (19 days)   │
│                                                              │
│  ┌─ January ─────────────────────────────────────────────┐  │
│  │  26 Jan    Republic Day                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ February ────────────────────────────────────────────┐  │
│  │  26 Feb    Maha Shivaratri                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ March ───────────────────────────────────────────────┐  │
│  │  14 Mar    Holi                                        │  │
│  │  29 Mar    Good Friday                                 │  │
│  │  31 Mar    Id-ul-Fitr (Eid)                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ August ──────────────────────────────────────────────┐  │
│  │  15 Aug    Independence Day                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Routing

```
/settings/holidays                    → Holiday Plan Management page (HR)
/settings/holidays/:listId            → Deep-link to a specific plan (HR)
/dashboard                            → Employee dashboard (includes upcoming holidays widget)
/my/holidays                          → Employee holiday list (full year view)
/my/holidays/calendar                 → Employee holiday calendar (month-by-month)
```

---

## Component Hierarchy

### Holiday Plan Management Page (HR)

```
HolidayManagementPage
├── HolidayPlanSidebar
│   ├── SearchInput (filter plans by name)
│   ├── PlanList
│   │   └── PlanCard (for each plan)
│   │       ├── PlanName
│   │       ├── EmployeeCount
│   │       └── DefaultBadge (if isDefault)
│   └── NewPlanButton ("+ New holiday plan")
│
├── HolidayPlanDetail (main content area)
│   ├── PlanHeader
│   │   ├── PlanNameTitle
│   │   ├── EmployeeCountLabel ("62 Employees")
│   │   └── PlanActions (Edit, Delete)
│   │
│   ├── YearTabs
│   │   └── YearTab (one per year: 2024, 2025, 2026, 2027)
│   │
│   ├── ActionBar
│   │   ├── AddHolidayButton ("+ Add Holiday")
│   │   └── ImportFromCountryButton ("Import from Country")
│   │
│   ├── ContentTabs
│   │   ├── HolidaysTab (default)
│   │   │   └── HolidayTable
│   │   │       ├── TableHeader (HOLIDAY NAME, DATE, OPTIONAL, SPECIAL)
│   │   │       └── HolidayRow (for each holiday)
│   │   │           ├── HolidayName
│   │   │           ├── HolidayDate (formatted)
│   │   │           ├── OptionalBadge ("Yes" / "No")
│   │   │           ├── SpecialBadge ("Yes" / "No")
│   │   │           └── RowActions (Edit, Delete - shown on hover)
│   │   │
│   │   └── EmployeesTab
│   │       ├── AssignEmployeesButton ("+ Assign Employees")
│   │       ├── AssignedEmployeeTable
│   │       │   └── EmployeeRow (for each assigned employee)
│   │       │       ├── EmployeeNumber
│   │       │       ├── DisplayName
│   │       │       ├── Email
│   │       │       └── RemoveButton (unassign)
│   │       └── EmptyState ("No employees assigned to this plan")
│   │
│   └── HolidayTable (legacy reference, see ContentTabs above)
│
├── Modals
│   ├── CreatePlanModal
│   │   ├── PlanNameInput
│   │   ├── YearInput
│   │   ├── DescriptionInput
│   │   ├── IsDefaultCheckbox
│   │   └── SubmitButton
│   │
│   ├── AddHolidayModal
│   │   ├── HolidayNameInput
│   │   ├── DatePicker
│   │   ├── OptionalCheckbox
│   │   ├── SpecialCheckbox
│   │   └── SubmitButton
│   │
│   ├── EditHolidayModal (same as Add, pre-filled)
│   │
│   ├── ImportHolidaysModal
│   │   ├── CountrySelect (searchable dropdown)
│   │   ├── YearSelect
│   │   ├── LoadButton
│   │   ├── HolidayPreviewTable (with checkboxes)
│   │   ├── SelectionCount ("4 of 6 selected")
│   │   └── ImportButton
│   │
│   ├── AssignEmployeesModal
│   │   ├── SearchInput (search by name, email, employee number)
│   │   ├── SelectAllCheckbox
│   │   ├── EmployeeCheckboxList (unassigned employees)
│   │   │   └── EmployeeCheckboxRow (checkbox, emp number, name, email)
│   │   ├── SelectedCount ("3 employees selected")
│   │   └── AssignButton
│   │
│   ├── UnassignConfirmModal
│   │   ├── WarningMessage (employee name + plan name)
│   │   └── ConfirmRemoveButton
│   │
│   ├── DeletePlanConfirmModal
│   │   ├── WarningMessage (includes employee count)
│   │   └── ConfirmDeleteButton
│   │
│   └── DeleteHolidayConfirmModal
│       └── ConfirmDeleteButton
│
└── EmptyState (when no plans exist)
    ├── IllustrationIcon
    ├── Message ("No holiday plans yet")
    └── CreateFirstPlanButton
```

### Employee Holiday Widget (Dashboard)

```
HolidayWidget
├── WidgetHeader ("Upcoming Holidays")
├── PlanInfo (useMyHolidayPlan → plan name, holiday count)
├── HolidayList (useUpcomingHolidays)
│   └── HolidayItem (for each upcoming holiday)
│       ├── HolidayDate (formatted)
│       ├── HolidayName
│       └── OptionalBadge (if isOptional)
└── ViewAllLink → /my/holidays
```

### Employee Holiday Calendar Page

```
HolidayCalendarPage
├── PageHeader
│   ├── Title ("Holiday Calendar 2026")
│   ├── PlanName (from useMyHolidayPlan)
│   ├── TotalCount ("19 days")
│   └── YearSelector (dropdown or tabs)
├── MonthSections (from useHolidayCalendar)
│   └── MonthSection (for each month with holidays)
│       ├── MonthHeader ("January", "February", etc.)
│       └── HolidayList
│           └── HolidayRow
│               ├── Date (formatted)
│               ├── HolidayName
│               └── OptionalBadge / SpecialBadge
└── EmptyState (if no holidays)
```

---

## Page Layout & Wireframes

### Main Page Layout

The Holiday Plan Management page uses a master-detail layout (similar to the Keka screenshots):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SETTINGS > HOLIDAYS                                                     │
├───────────────────────┬─────────────────────────────────────────────────┤
│                       │                                                  │
│  🔍 Search plans      │  PB-IN                           62 Employees   │
│                       │                                                  │
│  ┌─────────────────┐ │  ┌───────┬───────┬───────┬───────┐              │
│  │ PB-IN           │ │  │ 2024  │ 2025  │ 2026* │ 2027  │              │
│  │ 62 emp  DEFAULT │◄│  └───────┴───────┴───────┴───────┘              │
│  └─────────────────┘ │                                                  │
│                       │  [+ Add Holiday]  [Import from Country]         │
│  ┌─────────────────┐ │                                                  │
│  │ US Holidays     │ │  ┌────────────────┬────────────┬─────┬─────┐   │
│  │ 5 emp           │ │  │ HOLIDAY NAME   │ DATE       │ OPT │ SPL │   │
│  └─────────────────┘ │  ├────────────────┼────────────┼─────┼─────┤   │
│                       │  │ New Year's Day │ 01 Jan 2026│ No  │ No  │   │
│                       │  │ Republic Day   │ 26 Jan 2026│ No  │ No  │   │
│                       │  │ Holi           │ 04 Mar 2026│ No  │ No  │   │
│                       │  │ Independence   │ 15 Aug 2026│ No  │ No  │   │
│                       │  │ Gandhi Jayanti │ 03 Oct 2026│ No  │ No  │   │
│                       │  │ Diwali         │ 03 Nov 2026│ No  │ No  │   │
│                       │  │ Guru Nanak     │ 24 Nov 2026│ No  │ No  │   │
│                       │  │ Christmas      │ 25 Dec 2026│ No  │ No  │   │
│  [+ New holiday plan] │  └────────────────┴────────────┴─────┴─────┘   │
│                       │                                                  │
├───────────────────────┴─────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────────────┘
```

### Year Tabs Behavior

- Display years for which this plan has holidays, plus adjacent years for navigation
- The currently selected year tab is highlighted
- Changing year tabs re-fetches the plan detail (or filters the holidays client-side by year if all years are loaded)
- The "active" year (matching the plan's `year` field) is marked with an asterisk or bold

### Row Hover Actions

When hovering over a holiday row, show inline action icons:

```
│ Republic Day   │ 26 Jan 2026│ No  │ No  │  ✏️  🗑️  │
```

---

## State Management

### Recommended Data Fetching Pattern (React/Next.js)

```typescript
// hooks/useHolidayPlans.ts
import useSWR from 'swr';

export function useHolidayPlans(year?: number) {
  const url = year
    ? `/api/v1/holiday-lists?year=${year}`
    : '/api/v1/holiday-lists';

  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  return {
    plans: data?.data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
```

```typescript
// hooks/useHolidayPlanDetail.ts
export function useHolidayPlanDetail(planId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    planId ? `/api/v1/holiday-lists/${planId}` : null,
    fetcher
  );

  return {
    plan: data?.data ?? null,
    holidays: data?.data?.holidays ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
```

```typescript
// hooks/usePublicHolidays.ts
export function useAvailableCountries() {
  const { data, error, isLoading } = useSWR(
    '/api/v1/holiday-lists/public-holidays/countries',
    fetcher
  );

  return {
    countries: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}

export function usePublicHolidays(
  countryCode: string | null,
  year: number | null
) {
  const { data, error, isLoading } = useSWR(
    countryCode && year
      ? `/api/v1/holiday-lists/public-holidays/${countryCode}/${year}`
      : null,
    fetcher
  );

  return {
    holidays: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}
```

```typescript
// hooks/useMyHolidays.ts (Employee self-service)
export function useMyHolidays(year: number) {
  const { data, error, isLoading } = useSWR(
    `/api/v1/holidays?year=${year}`,
    fetcher
  );

  return {
    holidays: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}
```

```typescript
// hooks/useMyHolidayPlan.ts (Employee self-service)
export function useMyHolidayPlan() {
  const { data, error, isLoading } = useSWR('/api/v1/holidays/plan', fetcher);

  return {
    plan: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}
```

```typescript
// hooks/useUpcomingHolidays.ts (Employee self-service)
export function useUpcomingHolidays(limit = 5) {
  const { data, error, isLoading } = useSWR(
    `/api/v1/holidays/upcoming?limit=${limit}`,
    fetcher
  );

  return {
    holidays: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}
```

```typescript
// hooks/useHolidayCalendar.ts (Employee self-service)
export function useHolidayCalendar(year: number) {
  const { data, error, isLoading } = useSWR(
    `/api/v1/holidays/calendar?year=${year}`,
    fetcher
  );

  return {
    calendar: data?.data ?? null,
    totalHolidays: data?.data?.totalHolidays ?? 0,
    months: data?.data?.months ?? {},
    isLoading,
    isError: !!error,
  };
}
```

```typescript
// hooks/useAssignedEmployees.ts
export function useAssignedEmployees(listId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    listId ? `/api/v1/holiday-lists/${listId}/employees` : null,
    fetcher
  );

  return {
    employees: data?.data ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
```

```typescript
// hooks/useUnassignedEmployees.ts
export function useUnassignedEmployees(listId: string | null, search: string) {
  const { data, error, isLoading } = useSWR(
    listId
      ? `/api/v1/holiday-lists/${listId}/employees/unassigned${search ? `?search=${encodeURIComponent(search)}` : ''}`
      : null,
    fetcher
  );

  return {
    employees: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}
```

### Page State

```typescript
interface HolidayManagementState {
  selectedPlanId: string | null;
  selectedYear: number;
  searchQuery: string;
  activeTab: 'holidays' | 'employees';
  modals: {
    createPlan: boolean;
    addHoliday: boolean;
    editHoliday: { open: boolean; holiday: Holiday | null };
    importHolidays: boolean;
    assignEmployees: boolean;
    unassignEmployee: {
      open: boolean;
      userId: string | null;
      displayName: string | null;
    };
    deletePlan: boolean;
    deleteHoliday: { open: boolean; holidayId: string | null };
  };
  importState: {
    countryCode: string | null;
    year: number;
    selectedHolidayDates: Set<string>;
  };
  assignState: {
    searchQuery: string;
    selectedEmployeeIds: Set<string>;
  };
}
```

### CRUD Actions

```typescript
async function createPlan(payload: {
  name: string;
  year: number;
  description?: string;
  isDefault?: boolean;
}) {
  const response = await fetch('/api/v1/holiday-lists', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}

async function addHoliday(
  listId: string,
  payload: {
    name: string;
    date: string;
    isOptional?: boolean;
    isSpecial?: boolean;
  }
) {
  const response = await fetch(`/api/v1/holiday-lists/${listId}/holidays`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}

async function importHolidays(
  listId: string,
  payload: {
    countryCode: string;
    year: number;
    selectedHolidays?: Array<{ name: string; date: string }>;
  }
) {
  const response = await fetch(
    `/api/v1/holiday-lists/${listId}/holidays/import`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}

async function deleteHoliday(listId: string, holidayId: string) {
  const response = await fetch(
    `/api/v1/holiday-lists/${listId}/holidays/${holidayId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}

async function deletePlan(listId: string) {
  const response = await fetch(`/api/v1/holiday-lists/${listId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}

async function assignEmployees(listId: string, employeeIds: string[]) {
  const response = await fetch(
    `/api/v1/holiday-lists/${listId}/employees/assign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ employeeIds }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}

async function unassignEmployees(listId: string, employeeIds: string[]) {
  const response = await fetch(
    `/api/v1/holiday-lists/${listId}/employees/unassign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ employeeIds }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}
```

### Assign/Unassign Toast Patterns

```typescript
// After assigning employees
try {
  const result = await assignEmployees(listId, selectedIds);
  toast.success(`${result.data.assigned} employees assigned successfully`);
  refreshAssignedEmployees();
  refreshPlans(); // sidebar employee count update
  closeModal('assignEmployees');
} catch (error) {
  toast.error(error.message);
}

// After unassigning an employee
try {
  const result = await unassignEmployees(listId, [userId]);
  toast.success('Employee removed from holiday plan');
  refreshAssignedEmployees();
  refreshPlans();
  closeModal('unassignEmployee');
} catch (error) {
  toast.error(error.message);
}
```

---

## Form Validation Rules

### Create/Edit Holiday Plan

| Field         | Rule                         | Error Message                        |
| ------------- | ---------------------------- | ------------------------------------ |
| `name`        | Required, 2-255 characters   | "Plan name must be 2-255 characters" |
| `year`        | Required, integer, 2000-2100 | "Year must be between 2000 and 2100" |
| `description` | Optional, string             | -                                    |
| `isDefault`   | Optional, boolean            | -                                    |

### Add/Edit Holiday

| Field        | Rule                              | Error Message                           |
| ------------ | --------------------------------- | --------------------------------------- |
| `name`       | Required, 2-255 characters        | "Holiday name must be 2-255 characters" |
| `date`       | Required, valid date (YYYY-MM-DD) | "Please select a valid date"            |
| `isOptional` | Optional, boolean                 | -                                       |
| `isSpecial`  | Optional, boolean                 | -                                       |

### Import Holidays

| Field              | Rule                     | Error Message                                  |
| ------------------ | ------------------------ | ---------------------------------------------- |
| `countryCode`      | Required, valid ISO code | "Please select a country"                      |
| `year`             | Required, integer        | "Please select a year"                         |
| `selectedHolidays` | At least 1 selected      | "Please select at least one holiday to import" |

### Assign Employees

| Field         | Rule                      | Error Message                         |
| ------------- | ------------------------- | ------------------------------------- |
| `employeeIds` | Required, at least 1 UUID | "Please select at least one employee" |

---

## Error Handling

### Standard Error Response Format

```json
{
  "statusCode": 400,
  "message": "A holiday already exists on 2026-01-26 in this list",
  "error": "Bad Request"
}
```

### Common Error Scenarios

| Endpoint                       | Error                | UI Action                                           |
| ------------------------------ | -------------------- | --------------------------------------------------- |
| `GET /holiday-lists`           | 401 Unauthorized     | Redirect to login                                   |
| `GET /holiday-lists`           | 403 Forbidden        | Show "Access denied" message                        |
| `POST /holiday-lists`          | 400 Validation error | Show inline field errors                            |
| `POST /.../holidays`           | 400 Duplicate date   | Show toast: "A holiday already exists on this date" |
| `DELETE /holiday-lists/:id`    | 404 Not found        | Refresh plan list, show toast                       |
| `GET /public-holidays/XX/2026` | 400 Invalid country  | Show "Country not supported" in modal               |
| `GET /public-holidays/IN/2026` | 502 API unavailable  | Show "Service temporarily unavailable, try again"   |
| `POST /.../holidays/import`    | 404 Plan not found   | Refresh plan list                                   |
| `POST /.../holidays/import`    | 201 with skipped > 0 | Show toast: "X imported, Y skipped (already exist)" |
| `POST /.../employees/assign`   | 404 Inactive/missing | Show "Plan not found or inactive"                   |
| `POST /.../employees/assign`   | 400 No profiles      | Show "No employee profiles found for the IDs"       |
| `POST /.../employees/assign`   | 400 Empty array      | Show "Select at least one employee"                 |
| `POST /.../employees/unassign` | 404 Plan not found   | Refresh plan list                                   |

### Toast Notification Pattern

```typescript
// After creating a plan
try {
  const result = await createPlan(payload);
  toast.success('Holiday plan created successfully');
  refreshPlans();
  setSelectedPlanId(result.data.id);
  closeModal('createPlan');
} catch (error) {
  toast.error(error.message);
}

// After importing holidays
try {
  const result = await importHolidays(listId, payload);
  const { added, skipped } = result.data;
  if (skipped > 0) {
    toast.info(
      `${added} holidays imported, ${skipped} skipped (already exist)`
    );
  } else {
    toast.success(`${added} holidays imported successfully`);
  }
  refreshPlanDetail();
  closeModal('importHolidays');
} catch (error) {
  toast.error(error.message);
}
```

---

## API Summary Table

| Method                       | Endpoint                                                     | Description                               | Auth |
| ---------------------------- | ------------------------------------------------------------ | ----------------------------------------- | ---- |
| **Holiday Plans (HR)**       |                                                              |                                           |      |
| POST                         | `/api/v1/holiday-lists`                                      | Create holiday plan                       | HR   |
| GET                          | `/api/v1/holiday-lists?year=`                                | List all active plans (with counts)       | HR   |
| GET                          | `/api/v1/holiday-lists/:id`                                  | Get plan with holidays                    | HR   |
| PATCH                        | `/api/v1/holiday-lists/:id`                                  | Update plan                               | HR   |
| DELETE                       | `/api/v1/holiday-lists/:id`                                  | Permanently delete plan                   | HR   |
| **Holidays in Plan (HR)**    |                                                              |                                           |      |
| POST                         | `/api/v1/holiday-lists/:listId/holidays`                     | Add single holiday                        | HR   |
| PATCH                        | `/api/v1/holiday-lists/:listId/holidays/:holidayId`          | Update holiday                            | HR   |
| DELETE                       | `/api/v1/holiday-lists/:listId/holidays/:holidayId`          | Remove holiday                            | HR   |
| POST                         | `/api/v1/holiday-lists/:listId/holidays/bulk`                | Bulk add holidays                         | HR   |
| **Import from Country (HR)** |                                                              |                                           |      |
| GET                          | `/api/v1/holiday-lists/public-holidays/countries`            | Get available countries (incl. India)     | HR   |
| GET                          | `/api/v1/holiday-lists/public-holidays/:countryCode/:year`   | Preview public holidays                   | HR   |
| POST                         | `/api/v1/holiday-lists/:listId/holidays/import`              | Import selected holidays                  | HR   |
| **Employee Assignment (HR)** |                                                              |                                           |      |
| GET                          | `/api/v1/holiday-lists/:listId/employees`                    | Get employees in plan                     | HR   |
| GET                          | `/api/v1/holiday-lists/:listId/employees/unassigned?search=` | Get unassigned employees                  | HR   |
| POST                         | `/api/v1/holiday-lists/:listId/employees/assign`             | Bulk assign employees (active plans only) | HR   |
| POST                         | `/api/v1/holiday-lists/:listId/employees/unassign`           | Bulk unassign employees                   | HR   |
| **Employee Self-Service**    |                                                              |                                           |      |
| GET                          | `/api/v1/holidays?year=`                                     | Get my holidays for a year                | All  |
| GET                          | `/api/v1/holidays/plan`                                      | Get my assigned holiday plan              | All  |
| GET                          | `/api/v1/holidays/upcoming?limit=`                           | Get next N upcoming holidays              | All  |
| GET                          | `/api/v1/holidays/calendar?year=`                            | Get holidays grouped by month             | All  |
