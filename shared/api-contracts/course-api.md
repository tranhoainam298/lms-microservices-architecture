# Course and Learning API Contract

**Owner:** Course Service

**Database:** Course DB (`courses`, `lessons`, `enrollments`, `lesson_progress`)

**Public base:** `/api/courses`

Course Service owns catalog data, instructor authoring, course access, lessons/resources, learning progress, administrative course reporting, and lesson context sent to the external AI system.

## Public catalog

### `GET /api/courses`

Returns an array of published courses only. Optional scalar query parameters are:

| Parameter | Validation / behavior |
|---|---|
| `search` | Maximum 100 characters; matches title or description. |
| `category` | Exact category, maximum 255 characters. |
| `minPrice` | Non-negative decimal with at most two decimal places. |
| `maxPrice` | Same format; cannot be below `minPrice`. |

Each item contains `id`, `title`, `description`, `category`, numeric `price`, `cover_image`, `status`, `created_at`, and `updated_at`. Invalid filters return `400 INVALID_COURSE_FILTER` or edge `INVALID_QUERY`.

### `GET /api/courses/categories`

Returns `{ "items": ["..."], "total": n }` containing distinct non-empty categories from published courses.

### `GET /api/courses/:courseId`

Returns `200 { course }` only for a published course. The course includes public metadata, `lessonCount`, and a lesson outline containing `id`, `title`, `orderIndex`, `type`, and `createdAt`. Public detail intentionally omits protected video/document URLs. Missing/unpublished courses return `404 COURSE_NOT_FOUND`.

## Student learning

All routes require a valid student JWT. `studentId` is derived exclusively from the JWT.

### `GET /api/courses/enrolled`

Returns the active enrolled courses for the JWT student, including stored `progress_percent`. It accepts no identity query or body field.

### `GET /api/courses/:courseId/learning`

Requires a published course and active enrollment. Success:

```json
{
  "course": { "id": 1, "title": "...", "description": "...", "price": 10, "status": "published" },
  "items": [],
  "completedLessonIds": [],
  "progress": { "completedLessons": 0, "totalLessons": 0, "percent": 0 }
}
```

Lesson items contain `id`, `courseId`, `title`, `videoUrl`, `documentUrl`, `orderIndex`, and `createdAt`. No enrollment returns `403 COURSE_ACCESS_REQUIRED`.

### `GET /api/courses/lessons/:lessonId`

Returns `200 { lesson }` with the protected video/document resource metadata only when the lesson belongs to a published course and the JWT student has an active enrollment. Errors include `400 INVALID_LESSON_ID`, `403 COURSE_ACCESS_REQUIRED`, and `404 LESSON_NOT_FOUND`.

### `POST /api/courses/lessons/:lessonId/complete`

The request has no body and accepts no student/course/progress authority from the browser. Course Service rechecks access, idempotently upserts one `lesson_progress` row, recalculates completed/total lessons, updates `enrollments.progress_percent`, and returns:

```json
{
  "completed": true,
  "lessonId": 1,
  "courseId": 1,
  "completedLessonIds": [1],
  "progress": { "completedLessons": 1, "totalLessons": 5, "percent": 20 }
}
```

### `GET /courses/:courseId/student-exam-access`

Direct Course Service dependency used by Exam Service. It requires the original student JWT and returns `200 { "allowed": true, "courseId": n }` only for an active enrollment in a published course. Missing course, unpublished course, and missing enrollment share the privacy-preserving `403 COURSE_ACCESS_REQUIRED` response. It does not trust custom identity headers.

## Instructor course authoring

All routes require a valid instructor JWT. Ownership always uses the JWT instructor ID.

| Method and public path | Purpose / response |
|---|---|
| `POST /api/courses/draft` | Create draft and optional initial lessons atomically; returns `201 { course }`. |
| `GET /api/courses/drafts/mine` | Return `{ items, total }` for owned draft courses. |
| `GET /api/courses/instructor/mine` | Return `{ items, total }` for all owned statuses with lesson/enrollment counts. |
| `PATCH /api/courses/drafts/:courseId` | Update owned draft `title`, `description`, `category`, `coverImage`, and `price`; returns `{ course }`. |
| `DELETE /api/courses/drafts/:courseId` | Soft-delete an owned draft with no enrollment history; returns `{ deleted: true, courseId }`. |
| `PATCH /api/courses/drafts/:courseId/publish` | Publish an owned ready draft; returns `{ course }`. |
| `GET /api/courses/drafts/:courseId/lessons` | List lessons for an owned draft. |
| `POST /api/courses/drafts/:courseId/lessons` | Add an owned-draft lesson; server allocates the next order. |
| `PATCH /api/courses/drafts/:courseId/lessons/reorder` | Reorder all lessons in an owned draft using `{ lessonIds: [...] }`; IDs must contain the exact lesson set once each. |
| `PATCH /api/courses/drafts/:courseId/lessons/:lessonId` | Update owned-draft lesson title/text/video/document content. |
| `DELETE /api/courses/drafts/:courseId/lessons/:lessonId` | Delete one lesson from an owned draft. |
| `GET /api/courses/instructor/:courseId/progress` | Return enrollment/progress summary and rows for an owned course. |

Draft creation body fields are `title`, `description`, `category`, `price`, optional `coverImage`, and optional `lessons`. Each initial lesson accepts `title`, optional `content`, optional `videoUrl`, optional `documentUrl`, and optional `orderIndex`. Browser fields `instructorId` and `status` are not used as authority; the backend forces `draft` and derives ownership from JWT.

Draft deletion is deliberately non-destructive: Course Service changes only the owned course status from `draft` to `deleted` inside a Course DB transaction. The operation is rejected with `409 COURSE_DELETE_NOT_ALLOWED` when enrollment history exists. Course, lesson, and cross-service quiz records are retained, while normal authoring, catalog, access, moderation, and instructor-monitoring queries exclude the deleted course.

Lesson mutation bodies use `title`, optional `videoUrl`, and optional `documentUrl`. Invalid URLs or fields return `400 VALIDATION_ERROR`; cross-instructor access is reported as not found.

`GET /api/courses/instructor/:courseId/progress` returns:

- `course`: owned course ID/title/status;
- `summary`: `totalEnrollments`, `activeEnrollments`, `completedEnrollments`, `averageProgress`;
- `items`: `enrollmentId`, `studentId`, `status`, `progressPercent`, `enrolledAt`.

The separate Exam Service endpoint for owned quiz results is documented in [exam-api.md](exam-api.md).

### `GET /courses/:courseId/instructor-access`

Direct Course Service dependency used by Exam Service. It forwards the instructor JWT and returns `200 { allowed: true, courseId }` only when that instructor owns the course; otherwise `404 COURSE_NOT_FOUND`.

## Administrative course operations

These public routes require an admin JWT.

### `GET /api/courses/admin/reports/courses`

Optional filters: `dateFrom=YYYY-MM-DD`, `dateTo=YYYY-MM-DD`, `category`, and `status=draft|pending_review|published|rejected`.

Returns:

- `summary`: total/published/draft/pending-review/rejected course counts plus total and active enrollments;
- `items`: course ID/title/category/status/price, enrollment counts, average progress, and timestamps.

Invalid values return `400 INVALID_REPORT_FILTER`.

### `PATCH /api/courses/admin/:courseId/status`

Body: `{ "status": "draft|pending_review|published|rejected" }`. Returns `200 { course }`; invalid status returns `400 INVALID_COURSE_STATUS` and missing course returns `404 COURSE_NOT_FOUND`.

### `PATCH /api/courses/admin/:courseId/category`

Body: `{ "category": "Development" }`. The category must be a non-empty string of at most 255 characters. Returns `200 { course }`; invalid input returns `400 INVALID_COURSE_CATEGORY` and a missing or deleted course returns `404 COURSE_NOT_FOUND`. Course Service persists the value in its own `courses.category` column.

`GET /api/courses/categories` remains the public published-category data source; categories are values on `courses`, not a separate table or service.

## Internal Payment Service APIs

These direct Course Service routes require a valid `X-Internal-Service-Secret`. They are not routed as browser enrollment shortcuts.

### `GET /courses/internal/purchasable/:courseId`

Returns `200 { course: { id, title, price, status } }` only for a published course. Payment Service uses this price as the trusted checkout source.

### `POST /courses/internal/enrollments/activate`

Body: `{ "studentId": n, "courseId": n }`. The identity is accepted only because the caller is authenticated Payment Service. Course Service verifies the course is published, locks the course/enrollment, and idempotently creates or reactivates the unique student/course enrollment. Success returns `{ enrollment: { id, studentId, courseId, status: "active" } }`.

When access is newly activated, Course Service publishes `CourseAccessActivatedEvent` using routing key `course.access.activated`. A repeated activation returns the existing active enrollment without a duplicate event or row.

### `GET /courses/internal/titles?ids=1,2`

Returns `{ courses: { "1": { id, title, price, status } } }` for up to 500 unique positive IDs. Payment Service uses this minimal map to enrich revenue reports. No instructor identity or private lesson content is returned.

## AI support

`POST /api/courses/lessons/:lessonId/ai/ask` is part of Course Service and is detailed in [ai-support-api.md](ai-support-api.md). Course Service uses Course DB for access and lesson context, then calls the external AI adapter; it never stores an AI conversation database.

## Deprecated route

`POST /api/courses/lessons` returns `410 ENDPOINT_DEPRECATED`. Use `POST /api/courses/drafts/:courseId/lessons`.
