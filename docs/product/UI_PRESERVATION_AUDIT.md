# UI Preservation Audit

This audit defines the protected Web Client baseline for the business-completeness pass. The goal is to make real data and real CRUD easier to use without redesigning Meridian LMS.

## Change policy

- Preserve the light Meridian theme, typography, spacing tokens, sidebar/header shell, cards, tables, forms, status badges, progress bars, and responsive breakpoints in `web-client/src/styles/global.css`.
- Reuse `AppShell`, `Sidebar`, `Header`, `StatCard`, `CourseCard`, `ProgressBar`, and `StatusBadge` before adding a new visual primitive.
- Do not introduce a UI framework, component library, new theme, fake dashboard values, or frontend copies of seeded records.
- New role pages must use the same `page-stack`, `page-intro`, `metrics-grid`, `card`, `table-container`, `table`, `form-control`, `form-alert`, and empty/loading patterns already used by active pages.
- Architecture-only legacy components remain unreachable from `App.jsx`; they are not a source for product UI.

## Current layout and visual language

| Area | Current implementation | Protected behavior / pattern |
|---|---|---|
| Application shell | `components/AppShell.jsx` | Fixed role-aware sidebar, sticky header, one main content region, mobile drawer and backdrop. |
| Navigation | `components/Sidebar.jsx` | Grouped role navigation, compact text marks, active state, same account footer and logout control. |
| Page identity | `components/Header.jsx` and `App.jsx` page metadata | Page context, title, subtitle, current account identity, connected state. |
| Summary values | `components/StatCard.jsx` | Four-column responsive metric grid and product wording. Values must come from APIs. |
| Course presentation | `components/CourseCard.jsx` | Catalog/enrollment status, real price, progress, and one clear next action. |
| Progress | `components/ProgressBar.jsx` | Clamped numeric percentage with accessible progress semantics. |
| Status | `components/StatusBadge.jsx` | Existing success/warning/danger/neutral mappings. |
| Forms | Existing login, profile, authoring, filter, checkout pages | `form-control`, grouped labels/helpers, disabled state, inline success/error feedback. |
| Data tables | Existing admin, instructor, and revenue pages | `table-container`/`table` or legacy-compatible `table-shell`/`data-table`, empty row, pagination where applicable. |
| Feedback | All active pages | Card loading states, `form-alert` errors, explicit empty state, confirmation before destructive action. |

## Active routes before this pass

The application uses in-memory page identifiers in `App.jsx`, not URL routing.

| Role | Active page identifiers | Page/component |
|---|---|---|
| All roles | `home`, `profile` | Product home card; `ProfilePage` |
| Student | `dashboard`, plus contextual `lesson`, `quiz`, `payment` | `StudentDashboard`, `LessonPage`, `QuizPage`, `PaymentPage` |
| Instructor | `course-draft`, `instructor-monitoring` | `InstructorCourseDraft`, `InstructorMonitoring` |
| Admin | `revenue-report`, `user-management`, `course-operations` | `AdminRevenueReport`, `AdminUserManagement`, `AdminCourseOperations` |

`OverviewPage`, `ArchitectureFlow`, and standalone `AiSupportPage` are not imported by the active application and must remain unreachable. AI support remains inside an unlocked lesson.

The delivered role navigation extends this baseline without changing the shell:

- Student: `dashboard`, `catalog`, `my-learning`, `quiz-results`, and `profile`; lesson, course detail, checkout, and quiz taking remain contextual destinations.
- Instructor: `instructor-dashboard`, `instructor-courses`, `course-draft`, `instructor-monitoring`, `instructor-results`, and `profile`.
- Admin: `admin-dashboard`, `user-management`, `course-operations`, `revenue-report`, `activity-report`, and `profile`.

Before authentication, the Login page exposes a read-only `Browse courses` action. It uses the same public catalog/detail endpoints and course components; enrollment, checkout, lesson content, progress, quiz, and AI actions still require an authenticated student account.

## Existing pages that remain visually protected

| Page | Required treatment | Classification |
|---|---|---|
| Login / registration | Keep split-panel layout, role selector, validation and real authentication calls. | A. Functional enhancement only if demo account metadata changes. |
| Profile | Keep two-card profile/password layout and real User API operations. | A. Functional enhancement. |
| Student dashboard | Keep welcome, cards, learning/catalog sections and right rail. Populate additional real learning metrics. | A. Functional enhancement. |
| Lesson viewer | Keep premium course header, outline, content/resources, progress and contextual AI panel. | A. Functional enhancement only. |
| Quiz | Keep question cards, progress and saved-result view. | A. Functional enhancement only. |
| Payment | Keep checkout summary and provider polling states. | A. Functional enhancement only. |
| Course authoring | Keep existing draft editor, lesson/quiz CRUD workspaces and library. | A. Functional enhancement only. |
| Instructor monitoring | Keep course selector, metric cards and progress/results tables. | A. Functional enhancement. |
| Admin users | Keep filters, role/status controls, confirmation and paginated table. | A. Functional enhancement. |
| Admin course operations | Keep filters, course moderation/category fields and login activity table. | A. Functional enhancement. |
| Revenue report | Keep filters, metric cards, chart/ranking and transaction ledger. | A. Functional enhancement only. |

## Additive product pages delivered

The following additive pages use the closest existing layout rather than a new design system:

| Missing page | Closest visual source | Classification | Real data source |
|---|---|---|---|
| Student course catalog (`catalog`) | Student dashboard catalog section | B. Additive screen | `GET /api/courses` |
| Student My Learning (`my-learning`) | Student dashboard course grid | B. Additive screen | `GET /api/courses/enrolled` |
| Student quiz history (`quiz-results`) | Instructor result table + quiz result card | B. Additive screen | `GET /api/exams/results/mine` |
| Public course detail inside authenticated catalog | Course card + lesson locked/detail patterns | B. Additive screen | `GET /api/courses/:courseId` |
| Instructor dashboard | Existing metric cards and monitoring tables | B. Additive screen | `GET /api/courses/instructor/mine` plus owned-course Exam summaries |
| Instructor My Courses (`instructor-courses`) | Instructor dashboard tables and Course Studio actions | B. Additive screen | `GET /api/courses/instructor/mine` |
| Admin dashboard | Existing admin/revenue metric cards and tables | B. Additive screen | User, Course, Payment, and login-activity report endpoints |

Category administration remains part of the real Course Operations page through course category updates. A standalone category entity is intentionally not faked because the current Course DB models categories as validated values on courses rather than a separate CRUD resource.

## Dashboard data lineage

No dashboard value in this table may be hardcoded or sourced from `mockData.js`.

| Visible value | Source database | Owner | Public endpoint | Frontend API function | Rendering component |
|---|---|---|---|---|---|
| Student enrolled count | Course DB | Course Service | `GET /api/courses/enrolled` | `studentApi.getEnrolledCourses` | `StudentDashboard`, My Learning page |
| Student average progress | Course DB | Course Service | `GET /api/courses/enrolled` | `studentApi.getEnrolledCourses` | `StudentDashboard` |
| Student completed lessons | Course DB | Course Service | `GET /api/courses/enrolled` | `studentApi.getEnrolledCourses` | `StudentDashboard` |
| Student recent quiz results | Exam DB | Exam Service | `GET /api/exams/results/mine` | `studentApi.getQuizResults` | `StudentDashboard`, Quiz Results page |
| Student catalog | Course DB | Course Service | `GET /api/courses` | `studentApi.getCatalog` | Student Dashboard, Catalog page |
| Instructor own/published/draft course counts | Course DB | Course Service | `GET /api/courses/instructor/mine` | `instructorApi.getOwnedCourses` | Instructor Dashboard |
| Instructor enrollment/progress totals | Course DB | Course Service | `GET /api/courses/instructor/mine` and `GET /api/courses/instructor/:courseId/progress` | `instructorApi.getOwnedCourses`, `getCourseProgress` | Instructor Dashboard, Monitoring |
| Instructor quiz summary | Exam DB | Exam Service | `GET /api/exams/courses/:courseId/results/summary` | `instructorApi.getCourseResultSummary` | Instructor Dashboard, Monitoring |
| Admin users/roles/status | User DB | User Service | `GET /api/users/admin/users` | `adminApi.getUsers` | Admin Dashboard, User Management |
| Admin course totals/status | Course DB | Course Service | `GET /api/courses/admin/reports/courses` | `adminApi.getCourseReport` | Admin Dashboard, Course Operations |
| Admin successful payments/revenue | Payment DB | Payment Service | `GET /api/payments/reports/revenue` | `adminApi.getRevenueReport` | Admin Dashboard, Revenue Report |
| Admin login activity | User DB | User Service | `GET /api/users/admin/reports/activity` | `adminApi.getActivityReport` | Admin Dashboard, Course Operations |

## Planned file-level changes

- **A — Functional enhancement:** `App.jsx`, `Sidebar.jsx`, `StudentDashboard.jsx`, `AdminUserManagement.jsx`, and `InstructorMonitoring.jsx` consume normalized API data and expose role-appropriate navigation.
- **B — Additive screen:** focused Student catalog/learning/results/detail, Instructor dashboard/course portfolio, and Admin dashboard components use current classes.
- **C — Small consistency fix:** scoped selectors support additive pages and responsive authoring actions; no token/theme/global reset changed.
- **D — Structural refactor:** one shared request utility and small role API modules were added. Existing large working pages were not moved.

No full redesign is permitted in this pass.

## Executed visual regression evidence

- The production Web build passed with 61 modules.
- `DASHBOARD_UI_RUNTIME_PASS` loaded the public catalog and authenticated Student, Instructor, and Admin workspaces from the Docker runtime.
- The browser traversed every active role navigation item and found no visible error alert, empty workspace, duplicate sidebar/header, or uncontrolled horizontal overflow.
- A real overflow in the Instructor draft action row was detected by that test, fixed with a scoped wrapping action container, rebuilt, and verified again.
- Student, Lesson Viewer, Instructor, and Admin screenshots in `docs/assets/readme/` were recaptured from the real local application after the final rebuild.
