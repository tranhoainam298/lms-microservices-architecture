# Constraints

## Technical constraints

| ID | Constraint |
|---|---|
| TC01 | The only core business services are User, Course, Exam & Quiz, and Payment. API Gateway is the client entry component; RabbitMQ is infrastructure; payment and AI providers are external systems. |
| TC02 | Web/Mobile clients call business APIs through the API Gateway. The Gateway routes requests and performs no business-database access. |
| TC03 | Database-per-service is mandatory: User DB, Course DB, Exam DB, and Payment DB only. Direct cross-service database connections and a shared application database are forbidden. |
| TC04 | Immediate business decisions use REST/internal APIs. RabbitMQ uses the durable topic exchange `lms_events` for asynchronous login, payment, and course-access events. |
| TC05 | Each event uses a versioned envelope and must not contain passwords, JWTs, provider keys, database credentials, or internal service secrets. Consumers and repeated commands must be idempotent where duplicate delivery is possible. |
| TC06 | Payments use an external ZaloPay/Momo gateway boundary. Current executable provider support may be narrower than the architectural alternatives and must be documented honestly. |
| TC07 | Learning questions use an external AI Chatbot System. Provider credentials stay server-side and the Course Service supplies authorized Course DB context. |
| TC08 | Services are packaged for Docker Compose deployment; each database uses its own persistent named volume and backup responsibility. Destructive volume/database reset is not an operational procedure. |
| TC09 | Reporting/analytics remain functions of approved services and the Web Client. No Analytics, Reporting, Notification, Enrollment, or AI core microservice and no extra database may be introduced. |

## Business constraints

| ID | Constraint |
|---|---|
| BC01 | Students, instructors, and admins may access only functions allowed by their verified JWT role. |
| BC02 | Lesson, quiz, progress, and lesson-context AI access require an active enrollment in a published course. |
| BC03 | An instructor may author or publish only an owned course, and required data must pass validation. |
| BC04 | A student quiz must contain valid questions and server-held answer keys; scoring is authoritative only in Exam Service. |
| BC05 | Paid-course access is activated only after a verified successful payment. Pending, failed, or cancelled payments must never create enrollment. |
| BC06 | Admins may view system-wide reports; instructors may view only data belonging to their courses. |
| BC07 | AI answers are learning support and do not replace official instructor or administrative decisions. |
| BC08 | Missing external credentials block live provider verification; the application must return an explicit safe error rather than fake payment or AI success. |
