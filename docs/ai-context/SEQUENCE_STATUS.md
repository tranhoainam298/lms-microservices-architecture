# Sequence Status

The authoritative sequence order is fixed below. Endpoint and event names match the current runtime rather than conceptual names from older diagrams.

## 1. Login

`User -> Web Client -> API Gateway -> User Service -> User DB -> RabbitMQ`

- Runtime endpoint: `POST /auth/login`
- Event: exchange `lms_events`, routing key `user.loggedin`
- Status: achieved and runtime verified through public login; a real exclusive queue captured `user.loggedin`.

## 2. Save Draft Course

`Instructor -> Web Client -> API Gateway -> Course Service -> Course DB`

- Runtime endpoint: `POST /courses/draft`
- Security: instructor JWT, server-derived instructor identity, transactional course/lesson creation
- Status: achieved and runtime verified by the public role E2E.

## 3. View Lesson

`Student -> Web Client -> API Gateway -> Course Service -> Course DB`

- Runtime endpoints: `GET /courses/:courseId/learning`, `GET /courses/lessons/:lessonId`, and `POST /courses/lessons/:lessonId/complete`
- Security: student JWT, published course, active enrollment
- Status: achieved and runtime verified. Course 224 persisted one completed lesson and 100% course progress.

## 4. Take Quiz

`Student -> Web Client -> API Gateway -> Exam Service -> Course Service (authorization) -> Exam DB`

- Runtime endpoints: `GET /exams/courses/:courseId/quizzes`, `GET /exams/quizzes/:quizId`, `POST /exams/quizzes/:quizId/submit`, and result routes
- Security: student JWT and Course Service access decision; answer keys remain server-side
- Status: achieved and revalidated. Quiz 808 was loaded without answer keys, graded server-side, and persisted result 5 as 20/20.

## 5. Pay for Course

`Student -> Web Client -> API Gateway -> Payment Service -> Course Service / Payment DB / ZaloPay -> RabbitMQ`

- Runtime endpoints: `POST /payments/checkout`, `GET /payments/check-status/:appTransId`, and `POST /payments/callback/zalopay`
- Events: `payment.succeeded`, `payment.failed`, then `course.access.activated` after idempotent synchronous access activation
- Status: source/event complete. Real RabbitMQ captured success, failure, and access-activation events; idempotency and no enrollment after failure passed. Live ZaloPay create/query remains blocked by placeholder sandbox credentials.

## 6. View Revenue Report

`Admin -> Web Client -> API Gateway -> Payment Service -> Payment DB -> Course Service -> Course DB -> Payment Service`

- Runtime endpoint: `GET /payments/reports/revenue`
- Internal metadata endpoint: `GET /courses/internal/titles?ids=...`
- Ownership: Payment Service aggregates; Payment Service never connects to Course DB
- Status: achieved and runtime verified. Missing/invalid/wrong-role requests were denied; admin aggregation and the internal-secret boundary passed.

## 7. Ask Learning Question

`Student -> Lesson UI -> API Gateway -> Course Service -> Course DB -> External AI Chatbot System`

- Runtime endpoint: `POST /courses/lessons/:lessonId/ai/ask`
- Security: student JWT, active enrollment, server-loaded lesson/course context
- Status: source/security complete. The enrolled missing-configuration request returned HTTP 503 `AI_PROVIDER_NOT_CONFIGURED`; a live provider call remains blocked by placeholder `AI_API_KEY`.
