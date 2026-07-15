# Functional Requirements

These are normative product requirements derived from the final architecture document. They describe required behavior, not implementation status. Current evidence and gaps are recorded in `docs/architecture/FINAL_WORD_ALIGNMENT_MATRIX.md`.

## Student

| ID | Requirement |
|---|---|
| FR-S01 | Register, log in, view personal information, and update the authenticated profile. |
| FR-S02 | Browse, search, and filter published courses and view course details. |
| FR-S03 | Enroll in a free course or purchase a paid course; paid access is granted only after verified payment success. |
| FR-S04 | View lessons and available video, document, text, and resource metadata only for an accessible course. |
| FR-S05 | Mark lessons complete idempotently and view persisted course progress. |
| FR-S06 | Load published quizzes without receiving answer keys, submit answers, receive server-calculated grades, and view own results. |
| FR-S07 | Ask learning questions from an unlocked lesson; the Course Service supplies lesson/course context to the external AI system. |

## Instructor / Teacher

| ID | Requirement |
|---|---|
| FR-I01 | Create, save, list, update, and safely delete owned draft courses, then publish valid course content. |
| FR-I02 | Create, edit, delete, and order lessons and manage supported video/document/text resource references for owned courses. |
| FR-I03 | Create, edit, delete, and publish quizzes and questions while keeping answer keys server-side. |
| FR-I04 | View progress and assessment results only for students in instructor-owned courses. |

## Admin

| ID | Requirement |
|---|---|
| FR-A01 | List users and manage supported account status/permissions with server-side admin authorization. |
| FR-A02 | Manage course categories and review/moderate course content where the approved business workflow requires it. |
| FR-A03 | View revenue, course, and user/activity reports within the data owner's service boundary. |
| FR-A04 | Export authorized report data and manage notification flows where those extended-scope capabilities are implemented. |

## External integrations and cross-domain rules

| ID | Requirement |
|---|---|
| FR-X01 | Payment Service obtains authoritative course/price information through Course Service, stores the transaction in Payment DB, and integrates with the external payment gateway. |
| FR-X02 | On verified success, Payment Service synchronously requests idempotent Course Service enrollment activation and publishes `payment.succeeded`; a failure publishes `payment.failed` and never grants access. |
| FR-X03 | Course Service publishes `course.access.activated` after successful access persistence. |
| FR-X04 | User Service publishes `user.loggedin` after successful authentication without including credentials, password data, or JWTs. |
| FR-X05 | Course Service loads authorized learning context from Course DB and calls the external AI Chatbot System; the browser never calls the AI provider directly. |

## Broader Word scope not implied as complete

Password recovery, learner/instructor discussions, essay/manual grading, bulk question import, automatic video-completion detection, scheduled reports, report export, course moderation/categories, and notifications are broader requirements. They must be reported as missing or partial until runtime evidence exists and must not be simulated in the client.
