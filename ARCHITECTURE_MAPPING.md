# Architecture Mapping

This table maps approved architecture components to the active implementation. Reporting and AI support are capabilities, not additional core LMS services.

## Core and edge components

| Architecture component | Active implementation | Responsibility | Data ownership / connectors |
|---|---|---|---|
| Web Client | `web-client/src`, React/Vite build | Student, instructor, and admin product UI; calls relative `/api` only | No database; no provider key |
| Nginx Load Balancer | `infra/nginx/load-balancer.conf` | Public port 8080, frontend routing, `/api` to Gateway | No business logic or database |
| API Gateway | `api-gateway/src` | Route proxy, JWT/role edge checks, validation, rate limiting | Calls four services; no SQL client |
| User Service | `user-service/src` | Authentication, profiles, user admin, login activity | User DB only; publishes `user.loggedin` |
| Course Service | `course-service/src` | Catalog, drafts, lessons, enrollments, progress, course reports, AI context | Course DB only; REST to external AI; publishes `course.access.activated` |
| Exam & Quiz Service | `exam-service` active C# folders | Quiz authoring, safe delivery, grading, results | Exam DB only; REST to Course Service for access/ownership |
| Payment Service | `payment-service/index.js`, `payment-service/src/events` | ZaloPay checkout/status/callback, payments, revenue | Payment DB only; REST to Course Service and ZaloPay; publishes payment events |

## Data ownership

| Database container / schema | Exclusive application owner | Current main tables |
|---|---|---|
| `user-db-mysql` / `lms_user_db` | User Service | `users`, `login_audit` |
| `course-db-mysql` / `lms_course_db` | Course Service | `courses`, `lessons`, `enrollments`, `lesson_progress` |
| `exam-db-mysql` / `lms_exam_db` | Exam & Quiz Service | `quizzes`, `questions`, `quiz_results` |
| `payment-db-mysql` / `lms_payment_db` | Payment Service | `transactions` |

No Payment -> Course DB, Course -> Payment/Exam DB, Exam -> Course DB, or Gateway -> database connector exists.

## Infrastructure and external systems

| Component | Implementation | Current role |
|---|---|---|
| Message Broker | RabbitMQ container and `lms_events` topic exchange | Persistent versioned events: `user.loggedin`, `payment.succeeded`, `payment.failed`, `course.access.activated` |
| Payment Gateway | ZaloPay Sandbox v2 integration in Payment Service | Backend-signed create/query and Key2 callback verification; Momo remains an alternative only |
| AI Chatbot System | `external-systems/ai-chatbot-system/mock-provider` | Legacy folder/container name, but active code is a real provider adapter with no canned fallback |
| External payment fixture | `external-systems/payment-gateway-zalopay-momo/mock-provider` | Local compatibility/demo fixture; not main payment completion path |
| Shared contracts | `shared/api-contracts`, `shared/event-contracts` | Documentation schemas only; not a shared service/database |
| Deployment | `docker-compose.yml`, `infra/`, Windows startup/repair scripts | Local Docker simulation, health checks, isolated data networks, optional backup profile |
| Mobile Client | `mobile-client` placeholder | Not an implemented/containerized client |

## Cross-service communication

- Exam Service -> Course Service: original JWT for student exam access and instructor ownership.
- Payment Service -> Course Service: internal secret for purchasable metadata, idempotent enrollment activation, and revenue course titles.
- Course Service -> External AI Chatbot System: validated question and minimal Course DB learning context.
- User, Payment, Course Services -> RabbitMQ: asynchronous events; events do not duplicate synchronous enrollment writes.

Revenue, course/progress, quiz-result, and activity reporting remain in Payment, Course, Exam, and User Services respectively. There is no Analytics or Reporting deployable service/database.
