# Next Tasks

A backlog of outstanding tasks to achieve full architectural alignment:

1.  **Implement View Lesson Enrollment Validations:**
    *   Update `GET /courses/lessons/:lessonId` in Course Service to check if the student (extracted from JWT) has an active enrollment in the parent course.
2.  **Implement API Gateway Proxy Routes:**
    *   Add `/payments` proxy routing to Payment Service.
    *   Add `/ai` proxy routing to Course Service.
3.  **Refactor Test Cross-Service Database Access:**
    *   Rewrite `tests/test-payment-flow.js` to query Course Service endpoints (e.g., enrolled courses) instead of querying the MySQL database directly.
4.  **Connect AI Chatbot System:**
    *   Expose AI support endpoints in Course Service to format prompts with lesson context and forward them to the external AI Chatbot System mock-provider.
