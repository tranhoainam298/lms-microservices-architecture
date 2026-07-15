# Implementation Status

This status distinguishes executed local verification from credential-dependent external verification. The architecture baseline and the business CRUD/demo-data product pass have both completed their non-credential-dependent checks.

## Business CRUD and demo-data branch

| Capability | Source status | Runtime/UI verification status |
|---|---|---|
| Explicit idempotent demo seeding for existing and fresh volumes | **Achieved** | Seed command passed twice with collision preflight; totals stayed exactly 55 users, 33 courses, 16 quizzes, and 36 transactions before final E2E fixtures. |
| Student dashboard aggregates | **Achieved** through Course and Exam owner APIs | DOM verified 3 enrollments, 3 completed lessons, 20% average progress, 2 quiz results, and populated catalog/learning pages. |
| Instructor dashboard aggregates | **Achieved** through separate Course and Exam APIs | DOM verified 6 courses, 12 students, 30% progress, 10 attempts, and 60% score; Progress and Results are distinct pages. |
| Admin dashboard aggregates | **Achieved** through User, Course, Payment owner APIs | DOM verified users/status, course totals, activity, 24 successful sales, and VND 17,926,000 revenue. |
| Instructor question CRUD | **Achieved** with draft ownership and answer-key isolation | Public-path create/read/update/delete lifecycle passed inside the 18-check product harness. |
| Course catalog free/paid filter and instructor display | **Achieved** (`priceType`, internal minimal profile lookup) | Public catalog rendered 19 cards; search/free/paid/detail/sign-in protection passed. |

Detailed executed evidence is recorded in `docs/product/BUSINESS_FUNCTIONALITY_VERIFICATION.md`.

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

- **Student:** authentication/profile, published-course discovery with category/price filters, course detail with minimal instructor enrichment, enrolled courses with lesson counts, free enrollment or paid checkout, protected lessons/resources, persisted progress, summarized quiz history, and enrolled-lesson AI support.
- **Instructor:** own draft lifecycle, lesson/resource management, explicit quiz/question CRUD, owned-course enrollment/progress aggregates, and Exam-owned result summaries.
- **Admin:** user/account administration with role/status totals, Course Service moderation/report operations, login activity, and Payment Service revenue report.

The architecture baseline public-path harness passed 16/16. The product branch then passed its separate 18/18 CRUD/RBAC harness and the browser-visible public/Student/Instructor/Admin navigation check.

## Architecture and deployment

| Capability | Status | Detail |
|---|---|---|
| Database per service | **Achieved and verified** | Architecture-boundary tests and the final Compose graph confirmed one owned MySQL database per core service. |
| RabbitMQ events | **Achieved and runtime verified** | The live exclusive queue captured `user.loggedin`, `payment.succeeded`, `payment.failed`, and `course.access.activated`; idempotency/no-enrollment-on-failure assertions passed. |
| Local Docker deployment | **Achieved and runtime verified** | `docker compose up -d --build` passed, 14 LMS containers were healthy, and public `/health` returned HTTP 200 with status `ok`. |
| User-facing architecture cleanup | **Achieved and verified** | The active role UI banned-label scan passed; the production build completed with 61 modules and the browser traversed every role menu without a layout/error regression. |

## External integration honesty

- ZaloPay code uses Sandbox endpoints only. No live success is claimed without configured sandbox credentials and an observed provider response.
- AI support uses a real server-side provider adapter. No live answer is claimed without a non-placeholder `AI_API_KEY` and an observed provider response.
- Missing external credentials do not make core LMS startup fail; the affected operation returns its documented safe configuration error.
