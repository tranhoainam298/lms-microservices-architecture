# Sequence-to-API Mapping

Browser paths use the `/api` prefix. Nginx removes it before API Gateway forwards the request to the same service path shown in the third column.

| # | Final sequence | Browser endpoint(s) | Owning/internal endpoint(s) | Owner and data | Event / external connector |
|---:|---|---|---|---|---|
| 1 | Login | `POST /api/auth/login` | `POST /auth/login` | User Service -> User DB `users`, `login_audit` | Publishes `UserLoggedInEvent` to `lms_events` / `user.loggedin`. |
| 2 | Save Draft Course | `POST /api/courses/draft` | `POST /courses/draft` | Course Service -> Course DB `courses`, optional `lessons` transaction | None. |
| 3 | View Lesson | `GET /api/courses/:courseId/learning`; `GET /api/courses/lessons/:lessonId`; `POST /api/courses/lessons/:lessonId/complete` | Same paths without `/api` | Course Service -> Course DB `courses`, `lessons`, `enrollments`, `lesson_progress` | None. |
| 4 | Take Quiz | `GET /api/exams/quizzes/:quizId`; `POST /api/exams/quizzes/:quizId/submit`; result routes | Exam paths without `/api`; `GET /courses/:courseId/student-exam-access` | Exam Service -> Exam DB; Course Service separately checks Course DB access | Exam -> Course REST with original student JWT. |
| 5 | Pay for Course | `POST /api/payments/checkout`; `GET /api/payments/check-status/:appTransId`; `POST /api/payments/callback/zalopay` | Payment paths without `/api`; `GET /courses/internal/purchasable/:courseId`; `POST /courses/internal/enrollments/activate` | Payment Service -> Payment DB; Course Service -> Course DB | ZaloPay Sandbox; `payment.succeeded`, `payment.failed`, `course.access.activated`. |
| 6 | View Revenue Report | `GET /api/payments/reports/revenue` | `GET /payments/reports/revenue`; `GET /courses/internal/titles?ids=...` | Payment Service aggregates Payment DB facts; Course Service returns Course DB metadata | Internal authenticated Payment -> Course REST. |
| 7 | Ask Learning Question | `POST /api/courses/lessons/:lessonId/ai/ask` | `POST /courses/lessons/:lessonId/ai/ask`; external adapter `POST /chat` | Course Service -> Course DB access/context | Course -> External AI Chatbot System REST; adapter -> configured provider. |

## Sequence security and authority

1. **Login:** credentials are validated against User DB and the server creates the JWT. The login event contains no credential or token.
2. **Save draft:** instructor identity comes from JWT; Course Service forces `status=draft`.
3. **View lesson:** student identity comes from JWT, access requires a published course plus active enrollment, and progress is calculated/persisted by Course Service.
4. **Take quiz:** Exam Service obtains the real course ID from Exam DB, asks Course Service for access, omits answer keys from student payloads, grades server-side, and saves one result per student/quiz.
5. **Pay:** amount comes from Course Service, provider confirmation drives Payment DB state, and the synchronous internally authenticated Course activation is authoritative. Events are asynchronous facts and do not perform a duplicate enrollment write.
6. **Revenue:** Payment Service owns aggregation. Course metadata is fetched through an internal Course API; no cross-database join occurs.
7. **AI:** Course Service validates enrollment and constructs context from Course DB. The external adapter alone holds the provider key; no canned answer is returned when configuration is missing.

## Additional implemented APIs supporting the actors

- Student: public course filters/detail/categories, `/courses/enrolled`, `/payments/mine`, `/exams/results/mine` and owned result detail.
- Instructor: owned course/draft listing, draft and lesson mutation/publish, full quiz draft CRUD/publish, course progress, and quiz-result summary.
- Admin: user listing/status/role, login activity, course report/moderation, and revenue report.

These supporting APIs retain the same ownership rules described in [api-to-database-mapping.md](api-to-database-mapping.md).
