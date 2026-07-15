# Use Case List

## Important architecture sequences (MVP verification focus)

| # | Use case | Primary actor | Owning service(s) | Required outcome |
|---:|---|---|---|---|
| 1 | Login | User | User Service | Credentials are validated in User DB, a JWT is returned, and a safe `user.loggedin` event is published. |
| 2 | Save Draft Course | Instructor | Course Service | A valid owned draft and its initial lessons are persisted atomically in Course DB. |
| 3 | View Lesson | Student | Course Service | Enrollment is verified, learning content is returned, and completion/progress is persisted idempotently. |
| 4 | Take Quiz | Student | Exam & Quiz Service, Course Service access API | Questions exclude answer keys; submission is graded server-side and the result is stored in Exam DB. |
| 5 | Pay for Course | Student | Payment Service, Course Service | A verified provider result updates Payment DB; success activates Course DB access, failure does not. |
| 6 | View Revenue Report | Admin | Payment Service, Course Service metadata API | Admin-only revenue is aggregated from successful payments and minimally enriched with course metadata. |
| 7 | Ask Learning Question | Student | Course Service, external AI Chatbot System | Enrollment is checked, Course DB context is supplied, and a safe provider answer is returned. |

## Supporting use cases in the Word scope

| Actor | Use cases | Scope note |
|---|---|---|
| Student | Register; view/update profile; browse/search/filter courses; view details; enroll; view resources; track progress; view results | Core product scope; implementation status varies by use case. |
| Student | Password recovery; discussion; essay assessment | Broader scope, not part of the seven important sequence proofs and not assumed complete. |
| Instructor | List/edit/delete/publish owned courses; manage lessons/resources; manage quizzes/questions; view owned-course progress/results | Required product scope; each capability needs independent ownership/RBAC evidence. |
| Instructor | Bulk question import; discussion; export class analytics | Broader scope and not assumed complete. |
| Admin | Manage accounts/status; manage permissions; categories; moderation; revenue/course/user reports | Required Word scope, with runtime status tracked separately. |
| Admin | Scheduled/exported reports; notification-flow management | Broader scope and not assumed complete. |
| Payment Gateway | Create and confirm external payment | External integration; executable provider support is ZaloPay Sandbox, while Momo is an architectural alternative unless separately implemented. |
| AI Chatbot System | Answer a context-bound learning question | External integration; live verification depends on configured provider credentials. |

All protected use cases derive actor identity and role from a verified JWT. Browser-supplied user/student IDs, grades, payment status, and payment amount are not authoritative.
