# Authentication and User API Contract

**Owner:** User Service

**Database:** User DB (`users`, `login_audit`)

**Public base:** `/api` through Nginx and API Gateway

## Public authentication

### `POST /api/auth/register`

Creates an active student account. Public registration cannot create instructor or admin accounts.

```json
{
  "email": "learner@example.test",
  "password": "<user-supplied password>",
  "fullName": "Example Learner",
  "role": "student"
}
```

`role` is optional and defaults to `student`; any non-student value returns `403 REGISTRATION_ROLE_FORBIDDEN`. Passwords require at least eight characters with a letter and a number and are stored only as bcrypt hashes.

Success: `201` with:

```json
{
  "user": {
    "id": 123,
    "email": "learner@example.test",
    "fullName": "Example Learner",
    "role": "student",
    "status": "active",
    "createdAt": "<timestamp>"
  }
}
```

Main errors: `400 MISSING_FIELDS`, `400 INVALID_EMAIL`, `400 INVALID_FULL_NAME`, `400 INVALID_PASSWORD`, `403 REGISTRATION_ROLE_FORBIDDEN`, and `409 ACCOUNT_ALREADY_EXISTS`.

### `POST /api/auth/login`

```json
{
  "email": "learner@example.test",
  "password": "<user-supplied password>",
  "role": "student"
}
```

User Service loads the real User DB record, verifies the bcrypt hash, account status, and selected role, creates an HS256 JWT valid for one day, and records the attempt in `login_audit`.

Success: `200` with a signed `accessToken`, `role`, and `userProfile` fields `id`, `email`, `fullName`, `role`, and `status`.

Main errors: `400 MISSING_FIELDS`, `400 INVALID_ROLE`, `401 INVALID_LOGIN`, `403 ACCOUNT_INACTIVE`, and `403 ROLE_MISMATCH`.

After a successful login, User Service publishes `UserLoggedInEvent` to `lms_events` with routing key `user.loggedin`. Its data contains only `userId`, `role`, and `loginTime`; it excludes passwords, password hashes, and JWTs. A broker publication failure is logged and does not invalidate the successful login.

## Authenticated profile

All routes below require `Authorization: Bearer <JWT>`.

| Method and public path | Body | Success |
|---|---|---|
| `GET /api/users/me` | none | `200 { user }` with public profile fields. |
| `PATCH /api/users/me` | `{ "fullName": "..." }` | `200 { user }`; identity comes from JWT. |
| `PATCH /api/users/me/password` | `{ "currentPassword": "...", "newPassword": "..." }` | `200 { changed: true, message }`; edge rate-limited. |

Profile responses never include `password_hash`. Inactive accounts receive `403 ACCOUNT_INACTIVE`. Password-change errors include `CURRENT_PASSWORD_INVALID`, `INVALID_PASSWORD`, and `PASSWORD_REUSE_NOT_ALLOWED`.

## Administrator user management

All routes require a valid admin JWT. Student and instructor roles receive `403 FORBIDDEN`.

### `GET /api/users/admin/users`

Optional query parameters:

| Parameter | Rule |
|---|---|
| `page` | Positive integer; default 1. |
| `pageSize` | 1–100; default 20. |
| `role` | `student`, `instructor`, or `admin`. |
| `status` | `active` or `inactive`. |
| `search` | Email/name search, maximum 100 characters. |

Returns `{ summary, items, total, page, pageSize }`; each item contains only public user fields. `summary` is calculated from the complete User DB account set, independently of the current page and optional list filters:

```json
{
  "summary": {
    "totalUsers": 0,
    "students": 0,
    "instructors": 0,
    "admins": 0,
    "activeUsers": 0,
    "inactiveUsers": 0
  },
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

`total` is the number of rows matching the supplied list filters; the summary remains the global account overview used by the Admin dashboard.

### `PATCH /api/users/admin/users/:userId/status`

Body: `{ "status": "active" }` or `{ "status": "inactive" }`. Returns `200 { user }`. An admin cannot deactivate their own account (`409 SELF_DEACTIVATION_FORBIDDEN`).

### `PATCH /api/users/admin/users/:userId/role`

Body: `{ "role": "student|instructor|admin" }`. Returns `200 { user }`. An admin cannot change their own role (`409 SELF_ROLE_CHANGE_FORBIDDEN`).

### `GET /api/users/admin/reports/activity`

Optional query parameters: `page` (default 1), `pageSize` (default 25, max 100), `status=success|failed`, `dateFrom=YYYY-MM-DD`, and `dateTo=YYYY-MM-DD`.

Success shape:

```json
{
  "summary": {
    "totalAttempts": 0,
    "successfulLogins": 0,
    "failedLogins": 0,
    "activeUsers": 0
  },
  "items": [],
  "page": 1,
  "pageSize": 25,
  "total": 0
}
```

Activity items contain audit ID, nullable user identity metadata, status, failure reason, and occurrence time. They do not expose password data, JWTs, or stored credentials.

## Internal profile lookup

### `GET /users/internal/profiles?ids=9101,9102`

This is a direct service-to-service User Service route. It is not exposed by API Gateway and requires a valid `X-Internal-Service-Secret` using timing-safe comparison.

- `ids` is a comma-separated list of 1–100 unique positive integer user IDs.
- Success returns only `{ "items": [{ "id": 9101, "fullName": "..." }] }`.
- Missing IDs are omitted; email, role, status, password hashes, login activity, and other account fields are never returned.
- Invalid input returns `400 INVALID_USER_IDS`; invalid internal authorization returns `403 FORBIDDEN`; a missing server-side secret returns `503 INTERNAL_AUTH_UNAVAILABLE`.

Course Service uses this minimal endpoint to enrich a public course detail with its instructor display name. It does not connect to User DB directly.
