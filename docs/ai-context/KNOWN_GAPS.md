# Known Gaps

This document tracks known deviations between the current codebase and the authoritative architectural design.

## Architectural Gaps

1.  **Missing API Gateway Routing:**
    *   `/payments` proxy mapping to `payment-service` is missing.
    *   `/ai` proxy mapping to `course-service` is missing.
2.  **Payment Access Activation Link:**
    *   The Payment Service should emit a `PaymentCompletedEvent` via RabbitMQ, which the Course Service consumes to create an active enrollment in `lms_course_db`. This connection is stubbed but not fully wired.
3.  **Missing Revenue Report Endpoint:**
    *   No backend service contains reporting aggregations for course revenues.
4.  **Missing Course Service AI Integration:**
    *   Course Service does not feed course context to the external AI Chatbot System.
5.  **View Lesson Validations:**
    *   Course Service lacks active enrollment verification checks before returning lesson data.

## Codebase and Test Gaps

1.  **Cross-Service Database Access in Tests:**
    *   `tests/test-payment-flow.js` makes direct connections to `lms_course_db` on port 3317. In production runtime code, services must adhere strictly to database-per-service isolation rules.
