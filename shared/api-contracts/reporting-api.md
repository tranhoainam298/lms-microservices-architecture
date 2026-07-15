# Reporting API Contracts

Reporting is implemented inside existing data-owning services. There is no Reporting or Analytics Service and no Reporting DB.

## Admin revenue report

### `GET /api/payments/reports/revenue`

**Owner:** Payment Service

**Data:** Payment DB `transactions`; minimal course metadata from Course Service

**Authorization:** admin JWT only (`401` missing/invalid; `403` student/instructor)

Optional scalar filters:

| Parameter | Rule |
|---|---|
| `dateFrom` | Inclusive `YYYY-MM-DD`. |
| `dateTo` | Inclusive `YYYY-MM-DD`; not before `dateFrom`. |
| `courseId` | Positive integer. |

Invalid filters return `400 INVALID_REPORT_FILTER`.

Success:

```json
{
  "summary": {
    "totalRevenue": 0,
    "totalTransactions": 0,
    "successfulTransactions": 0,
    "successRate": 0,
    "averageOrderValue": 0,
    "currency": "VND"
  },
  "courseBreakdown": [],
  "transactions": []
}
```

`totalTransactions` counts every transaction in the filtered scope. Revenue, successful count, success rate numerator, average order value, and course revenue use only the canonical Payment DB status `success`; `pending` and `failed` never contribute revenue.

Payment Service queries its database, then calls `GET /courses/internal/titles?ids=...` with `X-Internal-Service-Secret`. Course Service returns only `id`, `title`, `price`, and `status` from Course DB. Payment Service performs the final aggregation. Neither service connects to the other's database.

## Admin course report and moderation

### `GET /api/courses/admin/reports/courses`

**Owner:** Course Service

**Data:** Course DB `courses`, `enrollments`

**Authorization:** admin JWT only

Optional filters: `dateFrom`, `dateTo`, `category`, and `status=draft|pending_review|published|rejected`. Success returns a course-status/enrollment summary and course rows with enrollment counts and average progress.

### `PATCH /api/courses/admin/:courseId/status`

Admin-only course moderation. Body `{ "status": "draft|pending_review|published|rejected" }`; returns the updated course. This is a Course Service/DB operation, not a reporting-service write.

## Admin user activity

### `GET /api/users/admin/reports/activity`

**Owner:** User Service

**Data:** User DB `login_audit`, `users`

**Authorization:** admin JWT only

Filters: `page`, `pageSize`, `status=success|failed`, `dateFrom`, and `dateTo`. Returns summary counts and a paginated audit list. No password hash, JWT, or stored credential is exposed.

## Instructor learning progress

### `GET /api/courses/instructor/:courseId/progress`

**Owner:** Course Service

**Data:** Course DB `courses`, `enrollments`

**Authorization:** JWT instructor who owns the course

Returns enrollment counts, completed count, average progress, and enrollment rows. `studentId` values in this report are stored Course DB references, not request identity.

## Instructor quiz results

### `GET /api/exams/courses/:courseId/results/summary`

**Owner:** Exam & Quiz Service

**Data:** Exam DB `quizzes`, `quiz_results`

**Authorization:** JWT instructor; ownership verified via Course Service HTTP

Returns overall quiz/attempt/pass/average summary, per-quiz attempt statistics, and result rows. Exam Service never reads Course DB.

## Gateway role

API Gateway verifies coarse roles, validates route/query shapes where implemented, forwards Authorization, and preserves owner responses. It does not join data, calculate report values, or connect to a database.
