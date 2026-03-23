# 🧪 BUPT-AI Backend — cURL API Testing Guide

> **Base URL:** `http://localhost:5000`
> **Server:** Make sure `npm run dev` is running before testing.

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [Auth: Register](#2-register-a-new-user)
3. [Auth: Login](#3-login)
4. [Auth: Get Current User](#4-get-current-user-profile-protected)
5. [Onboarding: Update Profile](#5-onboarding---update-user-profile-protected)
6. [Error Scenarios](#6-testing-error-scenarios)
7. [Quick Reference Cheat Sheet](#7-quick-reference-cheat-sheet)

---

## 1. Health Check

Verify the server is running:

```bash
curl http://localhost:5000/
```

**Expected Response:**
```
BUPT-AI API is running
```

---

## 2. Register a New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "lastname": "Chiamaka",
    "firstname": "Peter",
    "middlename": "O",
    "matricNumber": "BU/21/0001",
    "schoolEmail": "peter@school.edu",
    "password": "MyPass@123"
  }'
```

### Required Fields

| Field          | Type   | Notes                           |
|----------------|--------|---------------------------------|
| `lastname`     | string | Required                        |
| `firstname`    | string | Required                        |
| `middlename`   | string | Optional                        |
| `matricNumber` | string | Required, must be unique        |
| `schoolEmail`  | string | Required, must be unique        |
| `password`     | string | Required, see rules below       |

### Password Rules

The password **must** satisfy ALL of these:
- At least **8 characters** long
- At least **1 uppercase** letter (A-Z)
- At least **1 lowercase** letter (a-z)
- At least **1 digit** (0-9)
- At least **1 special character** (`@$!%*?&`)

### Expected Response (201 Created):

```json
{
    "_id": "...",
    "name": "Peter Chiamaka",
    "email": "peter@school.edu",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> ⚠️ **IMPORTANT:** Copy the `token` value! You'll need it for all protected endpoints.

---

## 3. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "matricNumber": "BU/21/0001",
    "password": "MyPass@123"
  }'
```

### Required Fields

| Field          | Type   |
|----------------|--------|
| `matricNumber` | string |
| `password`     | string |

### Expected Response (200 OK):

```json
{
    "_id": "...",
    "name": "Peter Chiamaka",
    "email": "peter@school.edu",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "isOnboarded": false
}
```

- `isOnboarded` will be `false` until the user completes onboarding (i.e., the `school` field is set).

> 💡 **TIP:** Copy the `token` — you'll use it in the next steps.

---

## 4. Get Current User Profile (Protected)

This endpoint requires authentication. Pass your JWT token in the `Authorization` header:

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

Replace `<YOUR_TOKEN>` with the actual token from register or login.

### Full Example:

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZjEyYTQ..."
```

### Expected Response (200 OK):

```json
{
    "_id": "...",
    "lastname": "Chiamaka",
    "firstname": "Peter",
    "middlename": "O",
    "matricNumber": "BU/21/0001",
    "schoolEmail": "peter@school.edu",
    "studyPreference": "text",
    "dayOrNight": "day",
    "courses": [],
    "goals": [],
    "points": 0,
    "studyHoursTotal": 0,
    "createdAt": "...",
    "updatedAt": "..."
}
```

> Note: The `password` field is excluded from this response.

---

## 5. Onboarding — Update User Profile (Protected)

This endpoint updates the user's personalization and academic info. Requires authentication.

```bash
curl -X POST http://localhost:5000/api/onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "gender": "male",
    "age": 20,
    "preferredStudyMode": "visual",
    "audioOrText": "text",
    "breakDuration": "15 minutes",
    "dailyHours": "3 hours",
    "readerType": "night",
    "school": "Beijing University of Posts and Telecommunications",
    "department": "Computer Science",
    "level": 300,
    "courses": ["Data Structures", "Algorithms", "AI Fundamentals"]
  }'
```

### Available Fields

| Field               | Type     | Maps to (in DB)   | Notes                                         |
|---------------------|----------|--------------------|-----------------------------------------------|
| `gender`            | string   | `gender`           |                                               |
| `age`               | number   | `age`              |                                                |
| `preferredStudyMode`| string   | `studyPreference`  | One of: `visual`, `audio`, `text`, `mixed`    |
| `audioOrText`       | string   | `audioOrText`      | One of: `audio`, `text`                       |
| `breakDuration`     | string   | `readDuration`     | e.g., `"15 minutes"`                          |
| `dailyHours`        | string   | `studyHours`       | e.g., `"3 hours"`                             |
| `readerType`        | string   | `dayOrNight`       | One of: `day`, `night`, `both`                |
| `school`            | string   | `school`           |                                               |
| `department`        | string   | `department`       |                                               |
| `level`             | number   | `level`            |                                                |
| `courses`           | string[] | `courses`          | JSON array of strings                         |

All fields are **optional** — you can send only the ones you want to update.

### Expected Response (200 OK):

```json
{
    "_id": "...",
    "name": "Peter Chiamaka",
    "email": "peter@school.edu",
    "studyPreference": "visual",
    "isOnboarded": true
}
```

---

## 6. Testing Error Scenarios

### 6.1 Register — Missing Fields

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"lastname": "Chiamaka"}'
```

**Expected:** `400` — `"Please add all fields"`

---

### 6.2 Register — Weak Password

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "lastname": "Doe",
    "firstname": "Jane",
    "matricNumber": "BU/21/0002",
    "schoolEmail": "jane@school.edu",
    "password": "weak"
  }'
```

**Expected:** `400` — `"Password must be at least 8 characters long..."`

---

### 6.3 Register — Duplicate User

Run the same registration command twice.

**Expected:** `400` — `"User already exists"`

---

### 6.4 Login — Wrong Credentials

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "matricNumber": "BU/21/0001",
    "password": "WrongPassword1!"
  }'
```

**Expected:** `400` — `"Invalid credentials"`

---

### 6.5 Protected Route — No Token

```bash
curl http://localhost:5000/api/auth/me
```

**Expected:** `401` — `"Not authorized, no token"`

---

### 6.6 Protected Route — Invalid Token

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected:** `401` — `"Not authorized"`

---

## 7. Quick Reference Cheat Sheet

| #  | Method | Endpoint              | Auth?     | Description                  |
|----|--------|-----------------------|-----------|------------------------------|
| 1  | GET    | `/`                   | No        | Health check                 |
| 2  | POST   | `/api/auth/register`  | No        | Register a new user          |
| 3  | POST   | `/api/auth/login`     | No        | Login and get JWT token      |
| 4  | GET    | `/api/auth/me`        | **Yes** 🔒 | Get current user profile     |
| 5  | POST   | `/api/onboarding`     | **Yes** 🔒 | Update personalization/onboarding |

### Saving Your Token (Pro Tip)

To avoid copying the token every time, save it in a variable:

**PowerShell:**
```powershell
$TOKEN = "eyJhbGciOiJIUzI1NiIs..."
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

**Bash / Git Bash:**
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

---

### Suggested Testing Flow

```
1. Health Check       →  GET  /
2. Register           →  POST /api/auth/register   (copy token)
3. Get Profile        →  GET  /api/auth/me          (use token)
4. Login              →  POST /api/auth/login       (copy new token)
5. Onboarding         →  POST /api/onboarding       (use token)
6. Get Profile Again  →  GET  /api/auth/me          (verify onboarding data saved)
```

Happy testing! 🚀
