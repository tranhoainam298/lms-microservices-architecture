# Implementation Status

This status distinguishes executed local verification from credential-dependent external verification. The final focused tests, builds, Docker health checks, RabbitMQ capture, and role-based public-path E2E have completed.

## Seven authoritative flows

| # | Flow | Current status | Implementation evidence / verification state |
|---:|---|---|---|
| 1 | Login | **Achieved and runtime verified** | Public login passed and a real exclusive RabbitMQ queue captured the safe `user.loggedin` v1 event. Login remains available if non-critical event publication fails. |
| 2 | Save Draft Course | **Achieved and runtime verified** | Instructor JWT/ownership checks and a Course DB transaction create the draft and optional initial lessons atomically; the role E2E passed. |
| 3 | View Lesson | **Achieved and runtime verified** | Access, resources, idempotent `lesson_progress`, and recalculated enrollment progress passed. Course 224 persisted one completed lesson and 100% progress. |
| 4 | Take Quiz | **Achieved and runtime verified** | Quiz 808 returned two questions without answer keys; server grading persisted result 5 as 20/20, 100%, passed. |
| 5 | Pay for Course | **Source/event complete; live ZaloPay blocked by credentials** | Payment transitions use a Payment DB advisory lock and safe pending recovery for ambiguous provider timeouts. All payment/access RabbitMQ events passed, including one idempotent enrollment and zero enrollment after failure. Placeholder `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, and `ZALOPAY_KEY2` kept the real Sandbox cycle blocked; missing configuration returned 503 and wrote no transaction. |
| 6 | View Revenue Report | **Achieved and runtime verified** | Admin-only aggregation, Payment DB revenue rules, protected Course metadata enrichment, and role denials passed. |
| 7 | Ask Learning Question | **Source/security complete; live AI blocked by credentials** | Enrollment/context/security tests passed. Placeholder `AI_API_KEY` produced HTTP 503 `AI_PROVIDER_NOT_CONFIGURED`; no canned fallback is active. |

## Role capabilities in the aligned source

- **Student:** authentication/profile, published-course discovery and filtering, enrolled courses, free enrollment or paid checkout, protected lessons/resources, persisted progress, quizzes/results, and enrolled-lesson AI support.
- **Instructor:** own draft lifecycle, lesson/resource management, quiz/question management, and owned-course progress/result summaries.
- **Admin:** user/account administration, Course Service moderation/report operations, and Payment Service revenue report.

The public-path Student/Instructor/Admin harness passed 16/16. The final verification document records the exact persisted fixtures and build/runtime evidence.

## Architecture and deployment

| Capability | Status | Detail |
|---|---|---|
| Database per service | **Achieved and verified** | Architecture-boundary tests and the final Compose graph confirmed one owned MySQL database per core service. |
| RabbitMQ events | **Achieved and runtime verified** | The live exclusive queue captured `user.loggedin`, `payment.succeeded`, `payment.failed`, and `course.access.activated`; idempotency/no-enrollment-on-failure assertions passed. |
| Local Docker deployment | **Achieved and runtime verified** | `docker compose up -d --build` passed, 14 LMS containers were healthy, and public `/health` returned HTTP 200 with status `ok`. |
| User-facing architecture cleanup | **Achieved and verified** | The active Student, Instructor, and Admin UI banned-label scan passed and the Vite production build completed (50 modules). |

## External integration honesty

- ZaloPay code uses Sandbox endpoints only. No live success is claimed without configured sandbox credentials and an observed provider response.
- AI support uses a real server-side provider adapter. No live answer is claimed without a non-placeholder `AI_API_KEY` and an observed provider response.
- Missing external credentials do not make core LMS startup fail; the affected operation returns its documented safe configuration error.
