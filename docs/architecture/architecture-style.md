# Architecture Style

## Decision

The LMS uses a microservices architecture with an API Gateway, database-per-service persistence, synchronous REST communication for request/response business operations, and asynchronous RabbitMQ events for architectural notifications.

The deployable business services are deliberately limited to:

| Component | Primary responsibility | Owned data |
|---|---|---|
| User Service | Registration, login, JWT issuance, profiles, account administration, login activity | User DB |
| Course Service | Course drafts and publishing, lessons and resources, enrollments, learning progress, lesson-context AI access | Course DB |
| Exam & Quiz Service | Quiz authoring and publishing, secure question delivery, server-side grading, results | Exam DB |
| Payment Service | ZaloPay checkout and verification, payment state, revenue aggregation | Payment DB |

The API Gateway is an edge routing and authorization component; it is not a business-data owner. The Web Client is the implemented browser client. A Mobile Client remains an architectural client placeholder and is not deployed by the current Docker Compose stack.

## Applied patterns

### Microservices and bounded ownership

Each service owns a bounded business capability and its schema. A service may not import another service's database client, connection string, or tables. Cross-domain information is obtained through an authenticated service API or an event. In particular:

- Payment Service never reads or writes Course DB. It calls Course Service for trusted course metadata, enrollment activation, and report metadata.
- Exam Service never reads Course DB. It calls Course Service to verify that a student can access exams for the course.
- Course Service never reads Payment DB or Exam DB.
- API Gateway never connects to an application database.

This separation prevents schema coupling and makes data ownership explicit.

### API Gateway

The browser uses the relative `/api` base URL. Nginx removes that prefix and forwards only to API Gateway. API Gateway mounts the actual route groups `/auth`, `/users`, `/courses`, `/exams`, and `/payments`, verifies JWTs and coarse role rules where appropriate, then proxies to the owning service. It does not calculate scores, prices, enrollments, or revenue.

### Database per service

Four independent MySQL 8 databases and named volumes are used:

- `lms_user_db` for User Service;
- `lms_course_db` for Course Service;
- `lms_exam_db` for Exam & Quiz Service;
- `lms_payment_db` for Payment Service.

There is no shared application database, Reporting DB, Enrollment DB, Learning Result DB, or Chatbot DB. Reporting is implemented by the service that owns the source facts and enriches cross-domain data through a narrow internal API.

### Synchronous REST

REST is used when the caller needs an immediate authoritative answer:

- Web Client -> Nginx -> API Gateway -> owning service;
- Exam Service -> Course Service for student course/exam access;
- Payment Service -> Course Service for purchasable course metadata;
- Payment Service -> Course Service for internally authenticated, idempotent enrollment activation;
- Payment Service -> Course Service for minimal course metadata used by the revenue report;
- Course Service -> External AI Chatbot System for lesson-context questions.

The synchronous `POST /courses/internal/enrollments/activate` call is the authoritative immediate course-access path after verified payment. RabbitMQ does not perform a second enrollment write.

### Asynchronous RabbitMQ events

RabbitMQ provides the durable topic exchange `lms_events`. The current publishers use persistent JSON messages and a versioned envelope containing `eventId`, `eventType`, `eventVersion`, `occurredAt`, `source`, and `data`.

| Routing key | Producer | Meaning |
|---|---|---|
| `user.loggedin` | User Service | A user was authenticated and a JWT was created. |
| `payment.succeeded` | Payment Service | A stored pending payment transitioned to `success`. |
| `payment.failed` | Payment Service | A stored pending payment transitioned to `failed`. |
| `course.access.activated` | Course Service | Course access was newly activated in Course DB. |

These events are asynchronous notifications. Business state remains consistent if a non-critical publication fails: the error is logged safely and the database result is not rolled back. Repeated payment confirmation and enrollment activation are safe because state transitions are conditional and enrollment activation is idempotent. The system does not rely on a RabbitMQ consumer to grant access.

### External systems

- **Payment Gateway:** the executable provider integration is ZaloPay Sandbox v2. Momo is an architectural alternative only; no live Momo adapter is claimed.
- **AI Chatbot System:** an external adapter receives lesson context from Course Service and calls the configured real AI provider with a server-side key. The Docker service retains the legacy name `external-ai-chatbot-mock`, but its active `/chat` implementation does not return canned answers. Without `AI_API_KEY`, it returns `AI_PROVIDER_NOT_CONFIGURED`.

Live ZaloPay and AI-provider verification depends on local sandbox/provider credentials. Source completeness must not be reported as live verification when those credentials are absent.

## Why no additional business service was introduced

The final architecture fixes the core service set at four business services. Analytics/reporting responsibilities therefore remain modules inside the data-owning services and Web Client:

- revenue aggregation belongs to Payment Service and uses a narrow Course Service metadata API;
- learning progress belongs to Course Service;
- quiz results belong to Exam & Quiz Service;
- login activity belongs to User Service.

Creating Analytics, Reporting, Notification, Enrollment, or AI as additional core LMS microservices would violate the approved boundary and add a new database or cross-service data coupling without an authoritative requirement. RabbitMQ is infrastructure, while Payment Gateway and AI Chatbot System are external systems rather than core services.

## Operational scope

The implemented deployment is a local Docker Compose simulation. Nginx is the public entry at `http://localhost:8080`; direct Gateway and database host ports are local debugging aids. Kubernetes, AWS, S3, CloudFront, and production multi-region deployment are not implemented and must be treated only as future options.
