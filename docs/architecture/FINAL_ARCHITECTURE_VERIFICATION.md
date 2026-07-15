# Final Architecture Verification

This document is the evidence ledger for the final Word-architecture alignment pass. It separates **source-aligned** behavior from **executed runtime evidence**. The non-credential-dependent checks below were executed against the final Docker build; external-provider status remains explicitly credential-dependent.

Status terms used below:

- **Source aligned**: the current implementation and contract agree; any unverified external provider is separately marked blocked by credentials.
- **Runtime verified**: the behavior passed an executed test against the final local build.
- **Blocked by credentials**: source integration exists, but live verification requires an external sandbox/provider secret.
- **Gap**: the current executable product does not implement the stated capability.

## 1. Final architecture summary

The executable LMS is a local Docker Compose microservices system. A browser enters through Nginx at `http://localhost:8080`, uses relative `/api/*` requests, and reaches one API Gateway. The Gateway routes to the owning business service; it does not contain business persistence or cross-domain aggregation logic.

Four business services own four independent MySQL databases. Immediate authorization and state changes use REST. User login, payment-state facts, and course-access activation are published asynchronously through the durable RabbitMQ topic exchange `lms_events`. Verified payment still uses a synchronous, internally authenticated Course Service call as the authoritative immediate access path; an event never performs a second enrollment write.

The Payment Gateway and AI Chatbot System remain external systems. Reporting is implemented inside the service that owns the source facts and is composed in the Web Client; there is no Analytics, Reporting, Enrollment, Notification, or AI core LMS service and no shared application database.

## 2. Exact core services

| Runtime component | Architecture role | Active entry point |
|---|---|---|
| API Gateway | Edge routing, JWT verification, coarse role enforcement, downstream response preservation | `api-gateway/src/server.js` |
| User Service | Authentication, JWT issuance, profiles, user administration, login activity | `user-service/src/server.js` |
| Course Service | Catalog, authoring, lessons/resources, enrollment, progress, course reports, AI learning context | `course-service/src/server.js` |
| Exam & Quiz Service | Quiz authoring, secure delivery, server-side grading, results | `exam-service/Program.cs` |
| Payment Service | Checkout, ZaloPay verification, Payment DB transitions, revenue aggregation | `payment-service/index.js` |

Only User, Course, Exam & Quiz, and Payment are business microservices. Nginx, RabbitMQ, MySQL, Web Client, backup tooling, and external-system adapters are deployment/infrastructure components rather than additional business services.

## 3. Exact service-owned databases

| Owner | Database | Principal current tables | Ownership rule |
|---|---|---|---|
| User Service | `lms_user_db` / User DB | `users`, `login_audit` | Only User Service has application access. |
| Course Service | `lms_course_db` / Course DB | `courses`, `lessons`, `enrollments`, `lesson_progress` | Only Course Service has application access. |
| Exam & Quiz Service | `lms_exam_db` / Exam DB | `quizzes`, `questions`, `quiz_results` | Only Exam Service has application access. |
| Payment Service | `lms_payment_db` / Payment DB | `transactions` | Only Payment Service has application access. |

There is no Reporting DB, Chatbot DB, Enrollment DB, Learning Result DB, shared application DB, or direct service-to-service SQL connector.

## 4. External systems

| External system | Active relationship | Verification state |
|---|---|---|
| ZaloPay Sandbox | Payment Service signs and calls Sandbox v2 create/query endpoints; public callback MAC is verified server-side. | Source complete; live test blocked because all three sandbox credential variables contain placeholders. Missing configuration returned HTTP 503 and created no transaction. |
| Momo | Architectural alternative named by the final report. | No executable Momo adapter is claimed. |
| External AI Chatbot System | Course Service sends authorized lesson context to external `/chat`; the adapter calls the configured real provider. | Source complete; live call blocked because `AI_API_KEY` contains a placeholder. An enrolled request returned HTTP 503 `AI_PROVIDER_NOT_CONFIGURED`, with no canned answer. |

The Compose service name `external-ai-chatbot-mock` is retained for compatibility, but its active code is a provider adapter and does not return a canned fallback. `external-payment-gateway-mock` is a local compatibility fixture and is not the main ZaloPay checkout path.

## 5. Synchronous connectors

| Caller | Callee | Actual connector / endpoint | Purpose |
|---|---|---|---|
| Browser | Nginx | HTTP `http://localhost:8080`, relative `/api/*` | Single product entry. |
| Nginx | API Gateway | Removes `/api` and forwards the remaining path | Never routes browser API traffic directly to a business service. |
| API Gateway | User Service | `/auth/*`, `/users/*` | Authentication/profile/admin user operations. |
| API Gateway | Course Service | `/courses/*` | Catalog, authoring, learning, progress, moderation, reports, AI questions. |
| API Gateway | Exam Service | `/exams/*` | Quiz authoring, delivery, submission, results. |
| API Gateway | Payment Service | `/payments/*` | Checkout/status/callback/history/revenue. |
| Exam Service | Course Service | `GET /courses/:courseId/student-exam-access` | Student publication/enrollment decision before quiz list/load/submit. |
| Exam Service | Course Service | `GET /courses/:courseId/instructor-access` | Instructor ownership decision for quiz authoring/results. |
| Payment Service | Course Service | `GET /courses/internal/purchasable/:courseId?studentId=...` | Trusted published-course title/price and prior-access decision. |
| Payment Service | Course Service | `POST /courses/internal/enrollments/activate` | Internally authenticated, idempotent access activation. |
| Payment Service | Course Service | `GET /courses/internal/titles?ids=...` | Minimal course metadata for revenue reporting. |
| Course Service | External AI Chatbot System | `POST /chat` | Question plus minimal authorized Course DB learning context. |
| Payment Service | ZaloPay Sandbox | HTTPS Sandbox v2 create/query; callback received by Payment Service | Real sandbox payment orchestration. |

All service-to-database connectors use MySQL/TCP only to the service's owned database.

## 6. Asynchronous Message Broker events

All four contracts use exchange `lms_events` with `type=topic`, a version-1 envelope (`eventId`, `eventType`, `eventVersion`, `occurredAt`, `source`, `data`), persistent messages, and publisher confirms.

| Routing key | Producer | Business point | Sensitive-data rule | Runtime proof |
|---|---|---|---|---|
| `user.loggedin` | User Service | After credentials are validated, login audit is recorded, and JWT is created | No password, password hash, JWT, or secret | PASS: received by a unique exclusive/auto-delete runtime queue |
| `payment.succeeded` | Payment Service | Only when a stored `pending` transaction conditionally becomes `success` | Identifiers and payment facts only | PASS: received by the same real RabbitMQ runtime harness |
| `payment.failed` | Payment Service | Only when a stored `pending` transaction conditionally becomes `failed` | No credentials or provider keys | PASS: received; `failedEnrollment=0` proved no access activation |
| `course.access.activated` | Course Service | After a newly activated enrollment is committed | Student/course/enrollment identifiers and activation time only | PASS: received after synchronous activation; repeated activation left `idempotentEnrollment=1` |

Source-level idempotency is provided by conditional payment transitions and the unique student/course enrollment rule. Repeated success handling may retry synchronous activation but must not create another enrollment or publish another transition event. Failed payment handling never calls activation.

The final hardening pass also serialized payment completion with a Payment DB advisory lock and recovers an ambiguous provider timeout as a safe pending state. RabbitMQ connection listeners are attached before topology setup, preventing an early connection failure from escaping the publisher's retry path.

Current delivery semantics are intentionally honest: publication failure is logged safely and does not corrupt already committed owning data, but no transactional outbox is implemented. Therefore the source does not claim guaranteed at-least-once delivery across a process crash between database commit and publication.

## 7. Database ownership proof

Source and Compose inspection show the following controls:

1. Each service has one DB host/configuration family for its owned schema.
2. `docker-compose.yml` connects each business service to only its own `*-data-network`; the optional backup profile is the only component attached to all four data networks.
3. Payment obtains course price, access activation, and course titles over Course Service HTTP; it has no Course DB connector.
4. Exam obtains course/enrollment and instructor-ownership decisions over Course Service HTTP; it has no Course DB connector.
5. Course has no Payment DB or Exam DB connector.
6. API Gateway contains no application SQL client or DB network membership.
7. `tests/architecture-boundaries.test.js` scanned source configuration/imports and the Compose network graph and passed in the 9/9 focused static suite.

Prohibited connectors are: Payment Service -> Course DB, Course Service -> Payment DB, Exam Service -> Course DB, Course Service -> Exam DB, and API Gateway -> any application DB.

## 8. Seven sequence-to-code mappings

| # | Final sequence | Public endpoint(s) | Owning implementation and persistence | Event/external dependency | Evidence state |
|---:|---|---|---|---|---|
| 1 | Login | `POST /api/auth/login` | `authService.login`; User DB `users`, `login_audit` | `user.loggedin` | Runtime verified through public `/api`; broker event captured |
| 2 | Save Draft Course | `POST /api/courses/draft` | `createDraftCourse`; Course DB `courses`, optional `lessons`, transaction | None | Runtime verified in the role E2E |
| 3 | View Lesson | `GET /api/courses/:courseId/learning`, `GET /api/courses/lessons/:lessonId`, `POST /api/courses/lessons/:lessonId/complete` | Course Service; Course DB `courses`, `lessons`, `enrollments`, `lesson_progress` | None | Runtime verified; course 224 reached persisted progress 100% |
| 4 | Take Quiz | `GET /api/exams/quizzes/:quizId`, `POST /api/exams/quizzes/:quizId/submit`, result routes | Exam Service; Exam DB `quizzes`, `questions`, `quiz_results` | Exam -> Course access REST | Runtime verified: quiz 808, two questions, result 5, 20/20 (100%), passed |
| 5 | Pay for Course | `POST /api/payments/checkout`, `GET /api/payments/check-status/:appTransId`, `POST /api/payments/callback/zalopay` | Payment Service/Payment DB plus Course Service/Course DB activation | ZaloPay; `payment.succeeded`, `payment.failed`, `course.access.activated` | Source and RabbitMQ transitions verified; live ZaloPay blocked by placeholder credentials |
| 6 | View Revenue Report | `GET /api/payments/reports/revenue` | Payment Service aggregates Payment DB `transactions`; Course metadata via `/courses/internal/titles` | Internal Payment -> Course REST | Runtime verified: RBAC, calculation, and internal-secret boundary passed |
| 7 | Ask Learning Question | `POST /api/courses/lessons/:lessonId/ai/ask` | Course Service validates Course DB lesson/enrollment/progress and constructs context | External AI `/chat` | Source/security path verified; live provider blocked by placeholder `AI_API_KEY` |

The canonical Mermaid versions are in `docs/architecture/sequence-diagrams.md` and `docs/diagrams/sequence/01-login.md` through `07-ask-learning-question.md`.

## 9. Requirement traceability summary

The detailed row-level source is `docs/architecture/FINAL_WORD_ALIGNMENT_MATRIX.md`.

### Student

Verified capabilities include registration/login, profile/password management, published catalog browse/search/category/price filters, safe public detail, enrolled courses, free-course enrollment, paid access restriction, lesson/resource access, idempotent lesson completion and course progress, and secure quiz delivery/grading/results. The source-complete ZaloPay and enrolled lesson-context AI paths remain live credential-dependent. Password recovery and instructor discussion are recorded gaps rather than invented services.

### Instructor

Verified capabilities include owned draft create/list/edit/delete/publish, lesson text/video/document CRUD and reorder, quiz/question CRUD and publish, owned enrollment/progress monitoring, and owned quiz-result summary. The executable quiz model is the current single-choice embedded-question workflow; bulk standalone question-bank import and essay/manual grading are not claimed.

### Admin

Verified capabilities include protected profile, user list/filter/status/role operations, course-category maintenance on existing Course DB data, course moderation/reporting, login-activity reporting, revenue reporting, and authorized client-side report export. Announcement/notification management remains a gap; no Notification Service or DB was introduced.

The final public-path role harness passed 16/16 cases. Its latest persisted fixture used course 224, quiz 808, and result 5; direct Course DB and Exam DB checks confirmed the stored state.

### Architecture and documentation

The six architecture views, seven sequence sources, API/event contracts, API/database mapping, sequence/API mapping, and current-versus-future description are aligned to actual source paths and endpoints. The final static suite passed, including active UI labels, database ownership, event contracts, and source/security regressions.

## 10. Test and build results

No PASS below is inferred from source presence. Each PASS is based on an executed command or captured runtime response from the final verification run.

| Check | Required command / evidence | Current result |
|---|---|---|
| Focused static/security suite | Nine focused Node test files | PASS: 9/9 test files |
| Modified Node syntax | `node --check` over all modified Node files | PASS: 38/38 files |
| UI architecture-label scan | `node tests/no-architecture-ui-labels.test.js` | PASS |
| Startup safety | `node tests/startup-script-safety.test.js` | PASS |
| Quiz hardening | `node tests/quiz-hardening.test.js` | PASS |
| AI provider security | `node tests/ai-provider-integration.test.js` | PASS |
| Lesson access/progress | `node tests/lesson-learning-security.test.js` | PASS |
| Course domain/ownership | Course domain and authoring lifecycle focused tests | PASS |
| DB ownership | `node tests/architecture-boundaries.test.js` | PASS |
| Event contracts | `node tests/event-contracts.test.js` | PASS |
| Real RabbitMQ events | `node tests/rabbitmq-runtime.test.js` against running stack | PASS: all four exact routing keys; `idempotentEnrollment=1`, `failedEnrollment=0` |
| Web Client production build | `npm run build` in `web-client` | PASS: Vite built 50 modules |
| Exam Service build | `dotnet build --nologo` in `exam-service` | PASS: 0 warnings, 0 errors |
| Compose validation | `docker compose config -q` | PASS |
| Role-based API E2E | Student, Instructor, Admin through `http://localhost:8080/api` | PASS: 16/16 |
| Current-route smoke | `node tests/e2e-all-features.js` | PASS: 25 passed, 0 failed, 1 intentional skip; quiz happy submit was covered by the role E2E |
| Repository diff quality | `git diff --check` | PASS across the complete task diff |

## 11. Docker runtime health

The rebuilt topology includes Nginx, Web Client, API Gateway, four business services, four MySQL databases, RabbitMQ, the external AI adapter, the external payment compatibility fixture, and an opt-in backup job. All 14 normal LMS containers were healthy after the final build.

| Runtime evidence | Expected | Current result |
|---|---|---|
| `docker compose up -d --build` | Builds/updates the non-profile stack without deleting volumes | PASS |
| `docker compose ps` | Required containers running/healthy | PASS: 14/14 LMS containers healthy |
| Public `GET http://localhost:8080/health` | HTTP 200 | PASS: body status `ok` |
| Gateway/service flows | Requests traverse Nginx -> Gateway -> owner | PASS: 16/16 role E2E through `/api` |
| RabbitMQ exclusive queue | Four exact routing keys observed from safe triggers | PASS |
| Course DB evidence | Published course, active enrollment and persisted lesson progress | PASS: course 224, one lesson, student 25 active, 100%, one completed `lesson_progress` row |
| Exam DB evidence | Published quiz/questions/result | PASS: quiz 808, two questions, result 5, 20/20, 100%, passed |
| Revenue and internal API | Admin report and protected course-title enrichment | PASS: revenue RBAC/calculation; titles returned 403 without and 200 with the unprinted secret |

No existing database volume is to be reset or recreated for this verification.

## 12. Credential-dependent items

| Integration | Required variable names | Source state | Live state |
|---|---|---|---|
| ZaloPay Sandbox | `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2` | Sandbox create/query/callback source complete | **Blocked by placeholder credentials.** Missing-config checkout returned HTTP 503 and created no Payment DB transaction. |
| Real AI provider | `AI_API_KEY` (plus configured provider/model/base URL) | External provider adapter source complete; missing key returns configuration error | **Blocked by placeholder key.** Enrolled ask returned HTTP 503 `AI_PROVIDER_NOT_CONFIGURED`. |

Credentials must not be printed, committed, passed to Web Client, or included in event/AI learning payloads. Momo is not live-implemented and must remain documented only as an architectural alternative.

## 13. Honest remaining gaps and release decision

The non-credential-dependent blocking checks passed. Remaining limitations are:

1. Live ZaloPay and real AI-provider verification remain blocked by placeholder local credentials and are not claimed as passed.
2. RabbitMQ publication is confirmed/persistent and reconnecting but remains best-effort across the owning DB commit boundary because there is no transactional outbox.
3. Password recovery, student-instructor discussion, notification/announcement management, standalone bulk question-bank import, and essay/manual grading are not claimed as executable current features.
4. The mobile client is an architecture placeholder, not a deployed application.
5. The deployment is a local Docker simulation, not a production cloud/high-availability deployment. A local Compose project-name collision with an unrelated `costops` environment was observed and is an environment-level naming limitation rather than an LMS topology failure.
6. The external AI Compose service retains a legacy `mock` name even though active behavior is a real provider adapter; this is naming compatibility, not a canned-response claim.

**Current verification decision: READY FOR FINAL REVIEW for all non-credential-dependent architecture and functional requirements.** Live ZaloPay and AI provider outcomes remain explicitly blocked until non-placeholder credentials are supplied outside Git.
