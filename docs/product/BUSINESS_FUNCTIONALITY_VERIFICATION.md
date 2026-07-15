# Business Functionality Verification

This document is the evidence ledger for the `feature/lms-business-crud-demo-data` product-completeness pass. It deliberately separates source inspection from executed runtime proof.

> **Current state:** all non-credential-dependent product checks in this ledger were executed on the current branch against the running Docker stack and existing named volumes. Live ZaloPay and live AI remain explicitly credential-dependent.

## Evidence rules

- A database row alone does not prove a product feature.
- A dashboard value is verified only when it is traced through `owned database -> owning service -> API Gateway -> frontend API function -> visible component`.
- React constants, `mockData`, screenshots without API evidence, and fabricated success notifications are not accepted.
- Cross-service logical IDs do not create cross-database foreign keys or authorize direct database access.
- Record a pass only with the exact command result or an observed runtime artifact; source presence alone is not evidence.

## Final role capabilities

| Role | Capability | Source owner/API | Source status | Runtime/UI evidence |
|---|---|---|---|---|
| Student | Profile read/update/password change | User Service: `/api/users/me`, `/api/users/me/password` | Present | PASS: a temporary student read and updated the profile, changed the password, then authenticated with the new password through `/api`. |
| Student | Published catalog search/category/free-paid filter | Course Service: `/api/courses`, `/api/courses/categories` | Present; `priceType=free|paid` supported | PASS: public/authenticated filters returned only matching published courses; the browser rendered 19 cards. |
| Student | Published course detail and instructor display | Course Service: `/api/courses/:courseId`; User Service internal profile lookup | Present; minimal REST enrichment | PASS: public detail rendered and required sign-in before enrollment; no cross-DB lookup was added. |
| Student | Free enrollment / paid checkout | Course and Payment owner APIs | Present; backend-authoritative | PASS for free enrollment and access control. ZaloPay source is complete; live create/query is blocked by missing sandbox credentials. |
| Student | My Learning, lesson content, completion, progress | Course Service learning APIs | Present | PASS: 3 enrolled courses, 3 completed lessons, and 20% average progress rendered; repeated completion was idempotent. |
| Student | Quiz list/take/server grading/history | Exam Service `/api/exams/...` | Present; result summary added | PASS: incomplete submit returned 400 without consuming the attempt; complete submit returned 201, persisted one result, hid keys, and duplicate returned 409. |
| Student | Contextual lesson AI | Course Service -> external AI adapter | Source complete; live key-dependent | Static/security PASS; live answer blocked by missing `AI_API_KEY`, with no canned fallback. |
| Instructor | Owned course draft lifecycle | Course Service authoring APIs | Present | PASS: create/read/update, cross-owner denial, publish rules, and eligible soft-delete verified through `/api`. |
| Instructor | Lesson create/read/update/delete/reorder | Course Service draft lesson APIs | Present | PASS: persistent lesson plus exact temporary create/update/read/delete lifecycle verified. |
| Instructor | Quiz create/read/update/delete/publish | Exam Service course quiz APIs | Present | PASS: draft lifecycle, publish, and published-delete denial verified. |
| Instructor | Explicit question create/read/update/delete | Exam Service nested question APIs | Present on this branch | PASS: exact question lifecycle persisted through the public Gateway path. |
| Instructor | Owned learner/progress monitoring | Course Service progress APIs | Present | PASS: UI rendered 6 owned courses, 12 enrolled students, and 30% average progress. |
| Instructor | Course-wide and instructor-wide quiz summaries | Exam Service result summary APIs | Present | PASS: UI rendered 10 attempts and 60% average score; progress/results use distinct workspaces. |
| Admin | User list/filter/status/role management | User Service admin APIs | Present; global summary added | PASS: 57 users visible; temporary account status/role changes were restored and wrong roles were denied. |
| Admin | Course overview/moderation/category values | Course Service admin APIs | Present | PASS: 30 active courses rendered with real instructor/category/status data; Activity is a separate page. |
| Admin | Login activity | User Service activity report | Present | PASS: 232 successful sign-ins rendered during the DOM test, with populated activity rows. |
| Admin | Revenue report | Payment Service with Course metadata over internal REST | Present | PASS: 24 successful sales and VND 17,926,000 rendered; pending/failed rows were excluded. |

## CRUD matrix

| Domain | Create | Read | Update | Delete | Enforcement | Verification |
|---|---|---|---|---|---|---|
| Student profile | Registration | Own profile | Own name/password | Not exposed | JWT identity, password policy | PASS in the 18-check public-path harness. |
| Instructor course | Draft | Owned drafts/all owned | Owned draft fields/publish | Soft-delete eligible owned draft | JWT instructor; cross-owner hidden; enrolled draft protected | PASS, including cross-owner and published-delete rules. |
| Instructor lesson | Owned draft lesson | Owned draft lessons | Content/resource/reorder | Owned draft lesson | Course ownership and draft status | PASS for create/read/update/delete; reorder remains covered by the lifecycle test. |
| Instructor quiz | Owned draft quiz | Owned course quizzes/detail | Draft metadata/questions/publish | Owned draft quiz | Course Service ownership check + Exam DB instructor ID | PASS. |
| Instructor question | Draft quiz question | Owned draft question | Validated question/options/key/points | Owned draft question | Same course/quiz/question and JWT instructor | PASS. |
| Admin account | Public registration creates student only | Paginated/filterable users | Role/status | Not exposed | Admin JWT; self-demotion/deactivation protection | PASS; temporary account restored to active student. |
| Admin course operations | Instructor-owned creation | Cross-course report | Moderation/category value | No arbitrary hard delete | Admin JWT; Course DB only | PASS for report/filter/update paths; no arbitrary hard delete exposed. |

Standalone category entity CRUD is not claimed. Categories remain validated values owned by Course Service and are managed on course records.

## Demo seed verification

### Seed controls

| Requirement | Expected implementation | Evidence |
|---|---|---|
| Explicit execution only | `seed-demo-data.bat` invokes the PowerShell helper; normal startup does not seed repeatedly | PASS: launcher executed manually twice. |
| Existing named volumes | Helper applies schema checks, a read-only collision preflight, then guarded upserts | PASS on all four current volumes. |
| Fresh volumes | Docker init mounts include the deterministic demo seed after base schema | Compose config PASS; SQL follows current init schema. |
| Idempotency | Deterministic keys and guarded upserts; second run leaves counts unchanged | PASS: every count below matched exactly. |
| User-created data | Preflight rejects mismatched ID/natural-key pairs before the first write; no reset/delete/volume operation | PASS; existing non-demo rows remained present. |

### Database counts

Both columns below are totals immediately after the two completed seed runs and before the final E2E fixtures were added.

| Database | Metric | First run | Second run | Expected |
|---|---|---:|---:|---|
| User DB | users | 55 | 55 | includes 27 deterministic demo users plus existing rows |
| User DB | students / instructors / admins | 44 / 8 / 3 | 44 / 8 / 3 | exceeds the 20 / 5 / 2 demo minimum |
| User DB | login audit | 1902 | 1902 | meaningful success/failure/date distribution |
| Course DB | total / published / draft courses | 33 / 18 / 11 | 33 / 18 / 11 | total also includes retained soft-deleted verification rows |
| Course DB | lessons | 73 | 73 | includes 60 deterministic demo lessons |
| Course DB | enrollments | 51 | 51 | deterministic unique relationships plus existing rows |
| Course DB | lesson progress | 99 | 99 | varied completion supporting non-zero dashboard progress |
| Exam DB | quizzes / questions / results | 16 / 55 / 29 | 16 / 55 / 29 | includes 8 / 40 / 24 deterministic demo records |
| Payment DB | transactions | 36 | 36 | 36 deterministic demo transactions |
| Payment DB | success / pending / failed | 24 / 6 / 6 | 24 / 6 / 6 | all canonical states represented |
| Payment DB | successful revenue | 17,926,000 VND | 17,926,000 VND | successful rows only |

After the final CRUD harness added exact verification fixtures, a read-only database snapshot reported:

- User DB: 57 users (46 students, 8 instructors, 3 admins), 54 active, 3 inactive, 1,916 login-audit rows.
- Course DB: 35 total rows (19 published, 11 draft, 5 safely soft-deleted), 74 lessons, 52 enrollments, 99 lesson-progress rows.
- Exam DB: 17 quizzes (16 published, 1 draft), 56 questions, 30 results.
- Payment DB: 36 transactions (24 success, 6 pending, 6 failed), VND 17,926,000 successful revenue.

These higher totals are expected E2E fixtures and do not change the second-run seed-idempotency proof above.

### Idempotency result

- First seed command: **PASS** with collision preflight and the counts above.
- Second seed command: **PASS** with exactly the same counts.
- Duplicate-user/course/enrollment/provider-transaction checks: **PASS** in `tests/demo-seed-safety.test.js` and enforced by DB uniqueness/guarded identities.
- Evidence that unrelated rows were preserved: totals exceed deterministic seed counts, all pre-existing rows remained, and no destructive SQL or volume command was used.

## Dashboard data lineage and visible evidence

| Visible value | Source database | Owner endpoint | Frontend API function | Rendering page/component | API value | Visible UI evidence |
|---|---|---|---|---|---:|---|
| Student enrolled course count | Course DB | `GET /api/courses/enrolled` | `studentApi.getEnrolledCourses` | Student dashboard / My Learning | 3 | DOM metric and real course cards PASS. |
| Student average progress | Course DB | `GET /api/courses/enrolled` | `studentApi.getEnrolledCourses` | Student dashboard | 20% | DOM metric PASS. |
| Student completed lessons | Course DB | `GET /api/courses/enrolled` | `studentApi.getEnrolledCourses` | Student dashboard | 3 of 15 | DOM metric and persisted learning endpoint PASS. |
| Student recent quiz results | Exam DB | `GET /api/exams/results/mine` | `studentApi.getQuizResults` | Student dashboard / Quiz Results | 2 | DOM row and navigation PASS; a new result was persisted by E2E. |
| Student course catalog | Course DB | `GET /api/courses` | `studentApi.getCatalog` | Dashboard / Catalog | 19 cards | Public catalog/detail/filter DOM PASS. |
| Instructor own/published/draft courses | Course DB | `GET /api/courses/instructor/mine` | `instructorApi.getOwnedCourses` | Instructor dashboard | 6 / 5 / 1 | DOM metrics and course rows PASS. |
| Instructor enrolled students/progress | Course DB | owned-course APIs | `instructorApi.getOwnedCourses`, `getCourseProgress` | Instructor dashboard / Monitoring | 12 / 30% | DOM metrics and distinct Progress page PASS. |
| Instructor quiz result summary | Exam DB | `GET /api/exams/instructor/results/summary` | `instructorApi.getWorkspaceResults` | Instructor dashboard / Results | 10 attempts / 60% | DOM metrics and distinct Results page PASS. |
| Admin total/role/status users | User DB | `GET /api/users/admin/users` | `adminApi.getUsers` | Admin dashboard / User Management | 57 total / 46 students / 3 inactive | DOM metrics/table and status/role lifecycle PASS. |
| Admin course status totals | Course DB | `GET /api/courses/admin/reports/courses` | `adminApi.getCourseReport` | Admin dashboard / Course Operations | 30 active / 19 published / 11 draft | DOM metrics and separate course page PASS. |
| Admin successful payments/revenue | Payment DB | `GET /api/payments/reports/revenue` | `adminApi.getRevenueReport` | Admin dashboard / Revenue Report | 24 / 17,926,000 VND | DOM metrics/ledger PASS; revenue uses success only. |
| Admin login activity | User DB | `GET /api/users/admin/reports/activity` | `adminApi.getActivityReport` | Admin dashboard / Activity Report | 232 successful at test time | DOM metric, rows, and separate Activity page PASS. |

## Business rules

| Rule | Source implementation | Runtime result |
|---|---|---|
| Draft courses are excluded from public catalog | Course Service published-status filter | PASS: all public results were published. |
| Instructor can mutate only owned courses/lessons | JWT-derived instructor + ownership predicates | PASS: cross-owner update was hidden. |
| Only eligible drafts can be soft-deleted | Course Service status/enrollment checks | PASS: unused draft deleted; published course/quiz deletion denied. |
| Paid locked lessons require active enrollment | Course Service access check | PASS: lesson, completion, and quiz returned 403 for an unenrolled student. |
| Confirmed provider success is required for paid activation | Payment Service provider validation + internal Course API | Credential-dependent live flow; source/security baseline verified |
| Failed payment creates no enrollment | Payment/Course boundary and event tests | Baseline runtime proof remains valid; Payment/Course code was not weakened by this branch. |
| Enrollment uniqueness | Course DB unique student/course key + idempotent activation | PASS: repeated free enrollment/completion did not duplicate business rows. |
| Lesson completion is idempotent and recalculates progress | `lesson_progress` unique key + Course Service update | PASS: repeat call preserved completed count/percentage. |
| Quiz access requires course access | Exam Service -> Course Service REST | PASS: locked quiz returned 403. |
| Answer keys are hidden from students | Student DTO excludes answer key | PASS: recursive response scan found none. |
| Score is calculated server-side | Exam Service reloads Exam DB questions | PASS: complete answers persisted a server result; browser sent no score. |
| Student result ownership is JWT-derived | Exam Service result predicates | PASS: cross-student result returned 404. |
| Admin endpoints require admin role | Gateway and owner-service role checks | PASS: student/instructor dashboard/report access was denied. |
| Instructor monitoring is ownership-scoped | Course/Exam ownership checks | PASS in progress/result summary and cross-owner tests. |

## UI structure and preservation

- Existing `AppShell`, `Sidebar`, `Header`, cards, tables, forms, badges, progress bars, and global visual tokens remain the protected baseline.
- New role dashboards and catalog/history/detail surfaces are additive or functional enhancements using the same classes and component language.
- Architecture/demo screens remain unreachable from normal navigation.
- No new UI framework or broad theme rewrite is part of this pass.
- Visual regression review for Public, Student, Instructor, and Admin pages: **PASS**. The browser test traversed every active role menu, rejected alerts/empty workspaces/duplicate shells/horizontal overflow, and the README screenshots were recaptured from the running app.

See [UI Preservation Audit](UI_PRESERVATION_AUDIT.md) for the route and component inventory.

## Database ownership

| Service | Permitted database | Cross-domain dependency |
|---|---|---|
| User Service | User DB only | RabbitMQ publication; minimal internal profile response |
| Course Service | Course DB only | User Service minimal instructor profile; external AI adapter |
| Exam Service | Exam DB only | Course Service ownership/access REST |
| Payment Service | Payment DB only | Course Service price/enrollment/title REST; provider API |
| API Gateway | none | Proxies owner APIs only |

Architecture-boundary test after this delta: **PASS** (`ARCHITECTURE_BOUNDARIES_PASS`).

## Verification command ledger

| Check | Exact result |
|---|---|
| Existing architecture/security tests | 13 focused source/security suites PASS. |
| New seed/dashboard/CRUD tests | `DEMO_SEED_SAFETY_PASS`, `BUSINESS_DASHBOARD_API_PASS`, `UI_REAL_DATA_FLOW_PASS`; public runtime harness PASS 18/18. |
| Modified Node syntax checks | PASS for all changed Node/MJS entrypoints and harnesses. |
| Web Client `npm run build` | PASS, 61 modules transformed. |
| Exam Service `dotnet build --nologo` | PASS, 0 warnings / 0 errors. |
| `docker compose config -q` | PASS. |
| `docker compose up -d --build` and container health | PASS; all 14 LMS containers healthy/running. |
| Public `GET http://localhost:8080/health` | HTTP 200, `status=ok`. |
| Seed run 1 | PASS with 55 users, 33 courses, 16 quizzes, and 36 transactions total. |
| Seed run 2 / unchanged deterministic counts | PASS; all counts and successful revenue unchanged. |
| Student public-path E2E | PASS: profile, catalog/filter/detail/access, learning/progress, quiz submit/persistence/ownership. |
| Instructor CRUD/ownership E2E | PASS: course, lesson, quiz, question, publish/delete, ownership, progress/results. |
| Admin management/report E2E | PASS: dashboard, RBAC, user status/role restore, course/activity/revenue reports. |
| Browser-visible non-zero dashboard proof | `DASHBOARD_UI_RUNTIME_PASS`: public catalog plus all Student/Instructor/Admin dashboard metrics and role menus. |

## Intentionally deferred or credential-dependent items

- Live ZaloPay Sandbox create/query/payment requires non-placeholder `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, and `ZALOPAY_KEY2`. Seeded `demo_seed` history is presentation data and is not live-provider evidence.
- A live AI answer requires a non-placeholder `AI_API_KEY`; missing configuration must keep returning the documented safe error with no canned fallback.
- Momo remains an architectural alternative, not an implemented provider.
- Standalone category entity CRUD is deferred while categories remain Course Service-owned string values.
- Production backup scheduling, off-host retention, outbox persistence, and cloud deployment remain outside this local prototype pass.

## Product-review decision

**Status: READY FOR PRODUCT REVIEW**

All non-credential-dependent blocking checks passed. The external credential limitations above remain honestly separated from core product readiness.
