# Final Word Architecture Alignment Matrix

This matrix is the implementation traceability baseline for the final LMS architecture pass. The authoritative source available in the repository is the extracted final report at `docs/architecture/arch_doc_text.txt`; no `.docx`, `.doc`, or `.pdf` file is present inside the project root. Conceptual endpoint names from that report are mapped to the secure runtime endpoints instead of being copied literally.

Status meanings:

- **Achieved**: implemented and already supported by focused evidence.
- **Partial**: a secure implementation exists, but a required behavior, contract, event, UI, or runtime proof is incomplete.
- **Missing**: no active implementation was found.
- **Blocked by external credentials**: source integration exists but the external provider cannot be live-verified without local secrets.

## Hard architecture constraints

| Requirement | Architecture owner | Current implementation file | Current endpoint/event | Current status | Required change | Verification evidence |
|---|---|---|---|---|---|---|
| One browser entry path through Nginx and API Gateway | Nginx / API Gateway | `infra/nginx/load-balancer.conf`, `api-gateway/src/server.js`, `web-client/src/config/api.js` | Browser `/api/*` | Achieved | Preserve the single public entry. | Compose config PASS; public health HTTP 200; role E2E 16/16 through `/api` |
| Only four core business services | Architecture | `docker-compose.yml` | User, Course, Exam, Payment | Achieved | Keep AI and payment providers external; do not add Analytics/Reporting/Notification services. | Architecture boundary test, Compose service list |
| Database per service | All services | Four data access configurations and Compose networks | Four MySQL databases | Achieved | Preserve the automated source/network guard. | `tests/architecture-boundaries.test.js` PASS; 14 containers healthy |
| No direct cross-service database access | All services | Service DB configurations | Cross-domain HTTP only | Achieved | Preserve authenticated REST/event boundaries. | `tests/architecture-boundaries.test.js` PASS; final Compose graph verified |
| REST for immediate cross-domain decisions | Payment, Course, Exam | `payment-service/index.js`, `exam-service/Controllers/QuizController.cs` | Payment→Course activation/metadata; Exam→Course access | Achieved | Preserve authenticated synchronous activation as authoritative. | Payment, quiz, internal-auth tests |
| RabbitMQ topic exchange carries real architectural events | User, Payment, Course | `user-service/src/events/publisher.js`, `payment-service/src/events/publisher.js`, `course-service/src/data/courseEventPublisher.js` | `lms_events`: `user.loggedin`, `payment.succeeded`, `payment.failed`, `course.access.activated` | Achieved | Preserve confirm/reconnect behavior and idempotent business writes. | Event-contract test PASS; real exclusive-queue runtime captured all four keys; `idempotentEnrollment=1`, `failedEnrollment=0` |
| External payment gateway remains outside LMS core | Payment Service | `payment-service/index.js` | ZaloPay Sandbox v2 create/query/callback | Achieved | Keep sandbox-only validation and document Momo as an architectural alternative, not implemented runtime. | Focused payment tests; live check only with credentials |
| External AI system remains outside LMS core | Course Service / external adapter | `course-service/src/services/courseService.js`, `external-systems/ai-chatbot-system/mock-provider/index.js` | `POST /courses/lessons/:lessonId/ai/ask` -> external `/chat` | Blocked by external credentials | Source flow uses the external adapter without a canned fallback; live-verify only with a configured `AI_API_KEY`. | AI focused test PASS; enrolled runtime request returned HTTP 503 `AI_PROVIDER_NOT_CONFIGURED` with placeholder key |

## Student requirements

| Requirement | Architecture owner | Current implementation file | Current endpoint/event | Current status | Required change | Verification evidence |
|---|---|---|---|---|---|---|
| Register | User Service / User DB | `user-service/src/services/authService.js` | `POST /auth/register` | Achieved | Keep public role fixed to student. | Registration auth/security test |
| Login | User Service / User DB | `user-service/src/services/authService.js`, `user-service/src/events/publisher.js` | `POST /auth/login`; `user.loggedin` | Achieved | Preserve safe best-effort publication. | Public login E2E PASS; real RabbitMQ queue received `user.loggedin` |
| Password recovery | User Service / User DB | No active implementation | None | Missing | Implement only if a safe local recovery mechanism can satisfy the Word scope without adding Email Service; otherwise record an honest non-MVP gap. | Contract and focused auth test |
| View/update profile and password | User Service / User DB | `user-service/src/services/userService.js` | `GET/PATCH /users/me`, `PATCH /users/me/password` | Achieved | Synchronize contracts. | Profile focused E2E |
| Browse only published courses | Course Service / Course DB | `course-service/src/services/courseService.js` | `GET /courses` | Achieved | Preserve the published-only predicate and parameterized filters. | Course-domain test and public role E2E PASS |
| Search/filter course catalog | Course Service / Course DB | `course-service/src/services/courseService.js`, `web-client/src/pages/StudentDashboard.jsx` | `GET /courses?search=&category=&minPrice=&maxPrice=` | Achieved | Preserve parameterized filtering. | Course-domain test PASS; Web Client build PASS (50 modules) |
| View course details | Course Service / Course DB | `course-service/src/services/courseService.js` | `GET /courses/:courseId` | Achieved | Preserve published-only metadata and locked lesson summaries. | Public role E2E PASS |
| Enrolled-course list | Course Service / Course DB | `getEnrolledCourses` | `GET /courses/enrolled` | Achieved | Ensure only published active enrollments are returned. | Student identity/access test |
| Paid course access only after confirmed payment | Payment + Course | `payment-service/index.js`, `payment-service/src/paymentTransitions.js`, `courseService.activateEnrollment` | Verified ZaloPay confirmation -> internal activation plus events | Blocked by external credentials | Conditional transitions, synchronous activation, and idempotent enrollment are verified; live provider create/query needs real sandbox credentials. | RabbitMQ runtime PASS; duplicate activation left one enrollment; missing-config checkout returned 503 and no transaction |
| Free-course enrollment | Course Service / Course DB | `course-service/src/services/courseService.js` | `POST /courses/:courseId/enroll` | Achieved | Preserve JWT identity and the published zero-price predicate. | Course-domain and public E2E PASS |
| View lessons/videos/documents/resources | Course Service / Course DB | `getStudentCourseLearning`, `getLesson` | `GET /courses/:courseId/learning`, `GET /courses/lessons/:lessonId` | Achieved | Preserve JWT/access checks. | Lesson-security and public E2E PASS; course 224 verified in Course DB |
| Persist lesson completion and course progress | Course Service / Course DB | `completeStudentLesson`, `lesson_progress` migration | `POST /courses/lessons/:lessonId/complete` | Achieved | Preserve idempotency and synchronize contracts/mappings. | Lesson progress test |
| Take quiz with hidden answer key | Exam Service / Exam DB | `QuizController.Load` | `GET /exams/quizzes/:quizId` | Achieved | Preserve Course access API check and response projection. | Quiz hardening + E2E |
| Server-side grading and persisted result | Exam Service / Exam DB | `QuizController.Submit` | `POST /exams/quizzes/:quizId/submit` | Achieved | Preserve JWT identity and duplicate policy. | Quiz result DB verification |
| View own quiz results | Exam Service / Exam DB | `QuizController.Results/ResultById` | `GET /exams/results/mine`, `GET /exams/results/:resultId` | Achieved | Synchronize contracts. | Ownership tests |
| Ask AI inside unlocked lesson | Course Service / Course DB / external AI | `askAiAboutLesson` | `POST /courses/lessons/:lessonId/ai/ask` | Blocked by external credentials | Lesson content/resources/progress context and enrollment checks are implemented; live-verify only when `AI_API_KEY` is configured. | AI and lesson focused tests PASS; enrolled runtime request returned 503 configuration error without an answer |
| Discussion with instructor | Course Service / Course DB | No active implementation | None | Missing | The report lists discussion but not an important MVP sequence; record as a post-MVP gap unless implementation is required by final review. | Traceability decision |

## Instructor requirements

| Requirement | Architecture owner | Current implementation file | Current endpoint/event | Current status | Required change | Verification evidence |
|---|---|---|---|---|---|---|
| Create and save draft course | Course Service / Course DB | `createDraftCourse` | `POST /courses/draft` | Achieved | Preserve transactional lesson creation; update contracts. | Save-draft test |
| List own drafts | Course Service / Course DB | `getInstructorDrafts` | `GET /courses/drafts/mine` | Achieved | Preserve JWT ownership. | Instructor ownership test |
| Edit own draft | Course Service / Course DB | `updateInstructorDraft` | `PATCH /courses/drafts/:courseId` | Achieved | Preserve ownership and draft-state checks. | Course domain/authoring tests and role E2E PASS |
| Delete own course under safe state rules | Course Service / Course DB | `deleteInstructorDraft` | `DELETE /courses/drafts/:courseId` | Achieved | Preserve owner/draft checks and refusal when dependent business data makes deletion unsafe. | Course authoring lifecycle and role E2E PASS |
| Publish owned course | Course Service / Course DB | `publishInstructorDraft` | `PATCH /courses/drafts/:courseId/publish` | Achieved | Document direct-publish rule used by current implementation. | Publish validation test |
| Manage lesson resources | Course Service / Course DB | lesson CRUD functions | `/courses/drafts/:courseId/lessons...` | Achieved | Include text content support from the existing schema; URL resources remain current executable storage model. | Lesson CRUD ownership tests |
| Reorder lessons | Course Service / Course DB | `reorderLessonsForInstructorDraft` | `PATCH /courses/drafts/:courseId/lessons/reorder` | Achieved | Preserve exact-set validation, two-phase ordering, and draft ownership. | Course authoring lifecycle test PASS |
| Create/edit/delete/publish quizzes and questions | Exam Service / Exam DB | `QuizController` | Instructor `/exams/courses/:courseId/quizzes...` | Achieved | Keep answer key instructor-only and synchronize contracts. | Quiz authoring/security tests |
| Standalone bulk question import / essay grading | Exam Service / Exam DB | Not implemented | None | Missing | Explicitly outside the secure current single-choice MVP; do not claim implemented. | Known-gap documentation |
| View enrollment/progress for owned courses | Course Service / Course DB | `getInstructorCourseProgress` | `GET /courses/instructor/:courseId/progress` | Achieved | Preserve owner and cross-instructor denial. | Course-domain test and role E2E PASS |
| View quiz result summary for owned courses | Exam Service / Exam DB + Course ownership API | `QuizController.ResultsSummary` | `GET /exams/courses/:courseId/results/summary` | Achieved | Preserve Course Service ownership decision and Exam DB-only aggregation. | Quiz-hardening test and role E2E PASS |

## Admin requirements

| Requirement | Architecture owner | Current implementation file | Current endpoint/event | Current status | Required change | Verification evidence |
|---|---|---|---|---|---|---|
| View/update own profile | User Service / User DB | profile APIs | `/users/me` | Achieved | Synchronize contract. | Admin profile test |
| List/filter users | User Service / User DB | `listUsers` | `GET /users/admin/users` | Achieved | Preserve admin-only RBAC. | User-management test |
| Lock/unlock accounts | User Service / User DB | `updateUserStatus` | `PATCH /users/admin/users/:userId/status` | Achieved | Preserve self-deactivation guard. | RBAC/status test |
| Assign permissions/roles | User Service / User DB | `userService.updateUserRole` | `PATCH /users/admin/users/:userId/role` | Achieved | Preserve allowed-role validation and unsafe self-change protection. | Static security suite and role E2E PASS |
| Manage course categories | Course Service / Course DB | `updateAdminCourseCategory`, `courses.category` | `PATCH /courses/admin/:courseId/category` | Achieved | Keep category ownership in Course Service without adding a database. | Course-domain focused test and Web Client build PASS |
| Review/moderate courses | Course Service / Course DB | `moderateCourseStatus` | `PATCH /courses/admin/:courseId/status` | Achieved | Preserve admin-only status validation and current direct-publish compatibility. | Course-domain test and role E2E PASS |
| Revenue report | Payment Service / Payment DB + Course API | `GET /payments/reports/revenue` | Same | Achieved | Preserve date/course validation and Payment-owned aggregation. | Runtime RBAC/calculation PASS; internal titles 403 without and 200 with secret |
| Course report | Course Service / Course DB | `getAdminCourseReport` | `GET /courses/admin/reports/courses` | Achieved | Preserve filters, empty data, and admin-only access. | Course-domain test and role E2E PASS |
| User/system activity report | User Service / User DB | `getAdminLoginActivity` | `GET /users/admin/reports/activity` | Achieved | Preserve filtered audit summary/list and admin-only access. | Role E2E PASS |
| Export reports | Web Client using protected report responses | `AdminRevenueReport.jsx`, `AdminCourseOperations.jsx` | Client-side CSV from authorized responses | Achieved | Preserve CSV formula neutralization and do not add a Reporting Service/DB. | Web Client build PASS; active UI scan PASS |
| Notification/announcement management | Existing owner service only | No active implementation | None | Missing | The report lists notification flows but no MVP sequence/data model; record an honest deferred gap unless final review requires a minimal Course-owned announcement module. | Traceability decision |

## Seven important sequences

| Sequence | Architecture owner | Actual runtime endpoint/event | Current status | Required alignment | Verification evidence |
|---|---|---|---|---|---|
| 1. Login | User Service | `POST /auth/login`, `user.loggedin` | Achieved | Diagram/contract and runtime flow are aligned. | Public login E2E PASS; live event captured |
| 2. Save Draft Course | Course Service | `POST /courses/draft` | Achieved | Diagram/contract, role, validation, and persistence are aligned. | Role E2E PASS |
| 3. View Lesson | Course Service | `GET /courses/:courseId/learning`, `GET /courses/lessons/:lessonId`, `POST .../complete` | Achieved | Diagram/contract include access denial and persisted progress. | Lesson-security test and persisted Course DB evidence PASS |
| 4. Take Quiz | Exam Service + Course access API | `GET /exams/quizzes/:quizId`, `POST .../submit` | Achieved | Diagram/contract include access denied, invalid answer, and duplicate attempt. | Quiz-hardening and happy-path E2E PASS; result 5 persisted |
| 5. Pay for Course | Payment + Course + RabbitMQ | `POST /payments/checkout`, callback/query, internal activation | Blocked by external credentials | Source and all three broker events are verified; real sandbox provider cycle needs credentials. | Event contracts/runtime PASS; live ZaloPay blocked by placeholders |
| 6. View Revenue Report | Payment + Course | `GET /payments/reports/revenue`, internal titles | Achieved | Filters, RBAC, aggregation ownership, and internal auth are aligned. | Runtime RBAC/calculation/internal endpoint PASS |
| 7. Ask Learning Question | Course + external AI | `POST /courses/lessons/:lessonId/ai/ask` | Blocked by external credentials | Context and security path are verified; keep live status blocked until a real provider call succeeds. | AI focused test PASS; enrolled missing-config request returned documented 503 |

## Documentation and verification work products

| Requirement | Owner | Current status | Required change | Evidence |
|---|---|---|---|---|
| Six architecture view documents contain no placeholders | Architecture docs | Achieved | Keep views synchronized with runtime. | Six completed files under `docs/architecture/`; focused static suite PASS |
| Seven standalone sequence sources | Architecture docs | Achieved | No source change remains; review Mermaid against final runtime endpoints. | `docs/diagrams/sequence/01-login.md` through `07-ask-learning-question.md` |
| API contracts match runtime | Shared contracts | Achieved | Recheck when endpoints change. | Completed contracts; role E2E and focused static suite PASS |
| Event contracts match runtime | Shared contracts | Achieved | Preserve captured envelope/routing-key agreement. | Four contracts; event test and real RabbitMQ capture PASS |
| API/database and sequence/API maps match runtime | Architecture docs | Achieved | Recheck when schema or routes change. | Completed maps; DB ownership and runtime persistence checks PASS |
| Stale description distinguishes implemented vs future | `Description.txt` | Achieved | Preserve the implemented/future distinction. | Current/future sections completed; static scan PASS |
| Final verification evidence | Architecture docs | Achieved | Keep provider-dependent outcomes explicitly blocked until real credentials exist. | `docs/architecture/FINAL_ARCHITECTURE_VERIFICATION.md`; build/runtime evidence recorded |
