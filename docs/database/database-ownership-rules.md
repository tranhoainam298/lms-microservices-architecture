# Database Ownership and Isolation Rules

## 1. Exclusive ownership

Exactly four application databases are permitted:

| Owner service | Owned MySQL database | Current tables |
|---|---|---|
| User Service | User DB (`lms_user_db`) | `users`, `login_audit` |
| Course Service | Course DB (`lms_course_db`) | `courses`, `lessons`, `enrollments`, `lesson_progress` |
| Exam & Quiz Service | Exam DB (`lms_exam_db`) | `quizzes`, `questions`, `quiz_results` |
| Payment Service | Payment DB (`lms_payment_db`) | `transactions` |

Only the owner may possess the database hostname, credentials, connection pool, ORM context, or SQL access for its database. API Gateway and Web Client never connect to an application database.

## 2. Cross-domain data

Identifiers copied across boundaries are logical references, not permission to query another schema. A service obtains foreign-domain information only through:

- an authenticated REST/internal API for a synchronous business decision; or
- a versioned RabbitMQ event for asynchronous notification.

No cross-database joins, shared application schema, database links, or direct foreign-service connection strings are allowed.

## 3. Current integration rules

### Payment and course access

Payment Service records provider state only in Payment DB. After confirmed success it publishes `PaymentSucceededEvent` and makes an internally authenticated synchronous request to Course Service. Course Service performs the authoritative, idempotent `enrollments` write in Course DB and publishes `CourseAccessActivatedEvent` after a newly activated row is committed.

The event does not create a second enrollment path, and Payment Service never writes Course DB.

### Revenue reporting

Payment Service is the report aggregation owner. It reads `transactions` from Payment DB and requests minimal course metadata from Course Service, which reads Course DB. API Gateway only authenticates/routes and does not aggregate or query data. There is no Reporting Service or Reporting DB.

### Lesson and quiz access

Course Service owns enrollment and learning progress. Exam Service asks Course Service over HTTP whether a student may access a course, then reads/grants quiz data using Exam DB only. Exam Service never reads Course DB.

### AI learning support

Course Service verifies enrollment and assembles course, lesson, resource, and progress context transiently from Course DB. It sends that context to the external AI Chatbot System over HTTP. The context is not persisted in a chatbot-specific table, and the external system has no access to Course DB.

## 4. Enforcement

- `tests/architecture-boundaries.test.js` scans service sources and Docker Compose configuration for foreign DB hosts, credentials, connection strings, SQL configuration, and database imports.
- Code review must reject any service that gains a direct connection to a foreign database.
- Fresh-schema and additive migration code must remain inside the owning service/database boundary.
