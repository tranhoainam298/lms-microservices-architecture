# Architecture Contract

This file is the persistent, implementation-facing architecture contract for the LMS. When older descriptions conflict with this contract, the final Word requirements and the verified current implementation take precedence.

## System boundary

### Clients

- `web-client`: the implemented Vite single-page application.
- Mobile client: an external client placeholder; it is not an implemented or containerized LMS service.

Normal browser traffic follows one entry path:

`Browser -> nginx-load-balancer -> api-gateway -> owning service`

The Web Client uses the relative `/api` base in the Docker build. Nginx removes `/api` and forwards only to the API Gateway. Neither the browser nor Nginx connects directly to a business service or database.

## Approved core services

The only deployable LMS business services are:

| Component | Responsibility | Default internal port |
|---|---|---:|
| API Gateway | JWT verification at the edge, role-aware routing, throttling, and transparent proxying | 3000 |
| User Service | Registration, login, profiles, account administration, and login audit | 5001 |
| Course Service | Courses, lessons/resources, enrollments, lesson/course progress, course reporting, and lesson AI context | 5002 |
| Exam & Quiz Service | Quiz/question authoring, student quiz delivery, server-side grading, and results | 5003 |
| Payment Service | Checkout, ZaloPay state, payment ownership, transaction ledger, and revenue aggregation | 5004 |

Reporting and analytics are responsibilities inside the approved owning services and Web Client. They are not separate deployable services.

## Database-per-service ownership

| Owner | Database | Default host port | Allowed data |
|---|---|---:|---|
| User Service | `lms_user_db` | 3316 | users and login audit |
| Course Service | `lms_course_db` | 3317 | courses, lessons, enrollments, and lesson progress |
| Exam Service | `lms_exam_db` | 3308 | quizzes, questions, and quiz results |
| Payment Service | `lms_payment_db` | 3309 | payment transactions |

No service may connect to another service's database. The API Gateway has no application-database connection. Cross-domain data is obtained only through an authenticated REST/internal API or an asynchronous event.

## Synchronous service communication

- Exam Service calls Course Service to validate instructor course ownership and student published-course/enrollment access.
- Payment Service calls Course Service for authoritative purchasable course metadata, idempotent enrollment activation, and minimal course-title enrichment for revenue reports.
- Course Service calls the external AI Chatbot System with enrolled lesson context.
- Payment Service calls ZaloPay Sandbox create/query endpoints and validates provider callbacks.

The synchronous, internally authenticated Payment Service -> Course Service activation call is the authoritative immediate-access path. RabbitMQ must not perform a second enrollment write.

## Asynchronous communication

RabbitMQ is infrastructure, not a business service. Producers publish versioned envelopes to the durable topic exchange `lms_events` using these canonical routing keys:

| Routing key | Producer | Meaning |
|---|---|---|
| `user.loggedin` | User Service | Credentials were verified and a login completed |
| `payment.succeeded` | Payment Service | A payment changed from pending to successful |
| `payment.failed` | Payment Service | A payment changed from pending to failed |
| `course.access.activated` | Course Service | Enrollment/access was activated idempotently |

Every event includes `eventId`, `eventType`, `eventVersion`, `occurredAt`, `source`, and `data`. Events never include passwords, password hashes, JWTs, API keys, database credentials, or internal service secrets.

Current publication uses publisher confirmation and safe logging but no durable outbox. A broker outage must not corrupt owning-service database state; User Service login remains available if its non-critical login event cannot be published. This delivery limitation is documented in `KNOWN_GAPS.md`.

## External systems

- **ZaloPay/Momo Payment Gateway:** the executable provider implementation is ZaloPay Sandbox. Momo is an architectural alternative, not a claimed live integration.
- **AI Chatbot System:** an external server-side real-provider adapter. The source directory and Compose service retain the legacy compatibility name `mock-provider` / `external-ai-chatbot-mock`, but the active `/chat` path does not return canned or mock answers. Without `AI_API_KEY`, it returns `AI_PROVIDER_NOT_CONFIGURED`.

## Forbidden additions

Do not create another core business service or database, including an Analytics, Reporting, Notification, Email, Enrollment, Learning Progress, AI, or Chatbot service/database. Do not create a shared application database or shared outbox database.
