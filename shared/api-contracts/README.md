# API Contracts

These contracts describe the current executable HTTP APIs. Browser examples include the public `/api` prefix; Nginx removes that prefix and API Gateway forwards the remaining route to the owning service.

## Contract index

| Contract | Route groups | Owner | Owned database / external dependency |
|---|---|---|---|
| [Authentication and users](auth-api.md) | `/auth`, `/users` | User Service | User DB; RabbitMQ login event |
| [Courses and learning](course-api.md) | `/courses` | Course Service | Course DB; External AI Chatbot System |
| [Exams and quizzes](exam-api.md) | `/exams` | Exam & Quiz Service | Exam DB; Course Service access API |
| [Payments](payment-api.md) | `/payments` | Payment Service | Payment DB; Course Service APIs; ZaloPay Sandbox; RabbitMQ events |
| [Reports](reporting-api.md) | User, Course, Exam, and Payment report endpoints | Existing owner services | Each owner reads only its database |
| [AI support](ai-support-api.md) | `/courses/lessons/:lessonId/ai/ask` | Course Service | Course DB; External AI Chatbot System |

## Security rules shared by all contracts

- Protected identity comes from a verified JWT. Browser-supplied `userId`, `studentId`, `instructorId`, or custom identity headers are never authoritative.
- Quiz score, pass status, payment amount, payment status, and enrollment status are calculated or loaded by the owning backend.
- API Gateway routes requests and applies edge validation; it never accesses an application database or implements business calculations.
- Cross-domain data uses a narrow REST/internal API or a RabbitMQ event. No service connects to another service's database.
- Internal Course Service routes require `X-Internal-Service-Secret` and are not browser APIs.
- Errors use `{ "code": "...", "message": "..." }` unless a provider callback requires its provider-specific acknowledgement format.

## Database ownership

| Service | Database |
|---|---|
| User Service | User DB (`users`, `login_audit`) |
| Course Service | Course DB (`courses`, `lessons`, `enrollments`, `lesson_progress`) |
| Exam & Quiz Service | Exam DB (`quizzes`, `questions`, `quiz_results`) |
| Payment Service | Payment DB (`transactions`) |

There is no shared application database, Reporting DB, Enrollment DB, or Chatbot DB.

## Event relationship

The durable RabbitMQ topic exchange is `lms_events`. Current routing keys are `user.loggedin`, `payment.succeeded`, `payment.failed`, and `course.access.activated`. The matching schemas live in `shared/event-contracts/`.
