# API-to-Database Mapping

This mapping uses the actual table names and active routes. A row containing an internal HTTP dependency describes two independent service operations; it never means one service connects to both databases.

## User Service -> User DB only

| API | Tables | Database operation / side effect |
|---|---|---|
| `POST /auth/register` | `users` | Insert bcrypt-hashed active student account. |
| `POST /auth/login` | `users`, `login_audit` | Read credential/status/role, record login attempt, publish `user.loggedin` after success. |
| `GET/PATCH /users/me`; `PATCH /users/me/password` | `users` | Read/update only the JWT user's profile/password hash. |
| `GET /users/admin/users` | `users` | Parameterized filtered/paginated user list. |
| `PATCH /users/admin/users/:userId/status` | `users` | Admin account status transition. |
| `PATCH /users/admin/users/:userId/role` | `users` | Admin role update with self-change protection. |
| `GET /users/admin/reports/activity` | `login_audit`, `users` | Filtered audit summary/list; public user metadata only. |

## Course Service -> Course DB only

| API | Tables | Database operation / side effect |
|---|---|---|
| `GET /courses`; `GET /courses/categories` | `courses` | Published catalog/filter/category reads. |
| `GET /courses/:courseId` | `courses`, `lessons` | Published public course and safe lesson outline. |
| `POST /courses/draft` | `courses`, optional `lessons` | Atomic instructor-owned draft creation. |
| `GET /courses/drafts/mine`; `GET /courses/instructor/mine` | `courses`, `lessons`, `enrollments` | JWT instructor-owned course listings/counts. |
| `PATCH /courses/drafts/:courseId`; publish route | `courses`, `lessons` | Owned draft validation/update/publish. |
| Draft lesson list/create/update/delete routes | `courses`, `lessons` | Owned draft lesson management. |
| `GET /courses/enrolled` | `courses`, `enrollments` | Active courses for JWT student. |
| `GET /courses/:courseId/learning`; `GET /courses/lessons/:lessonId` | `courses`, `lessons`, `enrollments`, `lesson_progress` | Enrolled published-course outline/content/progress. |
| `POST /courses/lessons/:lessonId/complete` | `courses`, `lessons`, `enrollments`, `lesson_progress` | Idempotent lesson completion plus course-progress recalculation in a transaction. |
| `GET /courses/:courseId/student-exam-access` | `courses`, `enrollments` | JWT student exam access decision for Exam Service. |
| `GET /courses/:courseId/instructor-access` | `courses` | JWT instructor ownership decision for Exam Service. |
| `POST /courses/lessons/:lessonId/ai/ask` | `courses`, `lessons`, `enrollments` | Load authorized learning context; external AI call has no AI DB write. |
| `GET /courses/instructor/:courseId/progress` | `courses`, `enrollments` | Owned course enrollment/progress report. |
| `GET /courses/admin/reports/courses`; moderation route | `courses`, `enrollments` | Admin course report and status update. |
| `GET /courses/internal/purchasable/:courseId` | `courses` | Minimal trusted published course metadata for Payment Service. |
| `POST /courses/internal/enrollments/activate` | `courses`, `enrollments` | Internally authenticated, idempotent enrollment activation; publishes `course.access.activated` only when newly activated. |
| `GET /courses/internal/titles` | `courses` | Minimal ID/title/price/status map for Payment revenue enrichment. |

`lesson_progress` is created additively by `migrateLessonProgress.js`; `enrollments` has the unique student/course rule enforced by `migrateEnrollmentUniqueness.js`.

## Exam & Quiz Service -> Exam DB only

| API | Tables | Database operation / dependency |
|---|---|---|
| Instructor quiz create/list/detail/update/delete/publish routes | `quizzes`, `questions` | Owned draft authoring and publication. Update replaces questions transactionally. |
| `GET /exams/courses/:courseId/quizzes` | `quizzes`, `questions` | Published quiz list after Course Service HTTP access decision. |
| `GET /exams/quizzes/:quizId` | `quizzes`, `questions` | Load safe student quiz; correct answer stays internal. |
| `POST /exams/quizzes/:quizId/submit` | `quizzes`, `questions`, `quiz_results` | Server-side grading and unique JWT student/quiz result insert. |
| `GET /exams/results/mine`; `GET /exams/results/:resultId` | `quiz_results` | JWT student's own historical results. |
| `GET /exams/courses/:courseId/results/summary` | `quizzes`, `quiz_results` | Instructor result aggregation after Course Service HTTP ownership decision. |

Exam Service's `COURSE_SERVICE_URL` is an HTTP dependency, not a Course DB connection.

## Payment Service -> Payment DB only

| API | Tables | Database operation / dependency |
|---|---|---|
| `POST /payments/checkout` | `transactions` | Course Service HTTP price lookup, pending insert, appTransId update, ZaloPay create call. |
| `GET /payments/mine`; `GET /payments/:paymentId` | `transactions` | JWT student's own payment history/detail. |
| `GET /payments/check-status/:appTransId` | `transactions` | Owner lookup, ZaloPay query, conditional `pending -> success|failed`; successful state calls Course Service activation. |
| `POST /payments/callback/zalopay` | `transactions` | MAC/identity verification, conditional success finalization, Course Service activation. |
| `GET /payments/reports/revenue` | `transactions` | Admin-filtered aggregation; Course titles are fetched through Course Service HTTP. |

Payment success publishes `payment.succeeded`; provider failure publishes `payment.failed`. Neither event grants access. Payment Service never imports Course DB credentials or tables.

## Gateway and external components

- API Gateway has no SQL client and no database mapping.
- RabbitMQ `lms_events` carries events but owns no LMS business data.
- ZaloPay Sandbox stores/processes external provider state; Payment DB remains the LMS transaction record.
- External AI Chatbot System uses a provider API but has no LMS database and cannot query Course DB.

## Forbidden mappings

The runtime contains no Payment Service -> Course DB, Course Service -> Payment DB, Exam Service -> Course DB, Course Service -> Exam DB, or API Gateway -> application DB connection. There is no `roles`, `user_roles`, `course_access`, `learning_progress`, `quiz_attempts`, `grading_results`, `revenue_records`, or AI-context table in the active schemas; prior documents using those names were stale.
