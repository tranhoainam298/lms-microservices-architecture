# Next Tasks

A backlog of outstanding tasks to achieve full architectural alignment:

1.  **Implement View Lesson Enrollment Validations:**
    *   Update `GET /courses/lessons/:lessonId` in Course Service to check if the student (extracted from JWT) has an active enrollment in the parent course.
2.  **Implement Remaining API Gateway Integration:**
    *   Add `/ai` proxy routing to Course Service when the AI business flow is implemented.
3.  **Refactor Test Cross-Service Database Access:**
    *   Rewrite `tests/test-payment-flow.js` to query Course Service endpoints (e.g., enrolled courses) instead of querying the MySQL database directly.
4.  **Connect AI Chatbot System:**
    *   Expose AI support endpoints in Course Service to format prompts with lesson context and forward them to the external AI Chatbot System mock-provider.
5.  **Close Deployment Portability Gaps:**
    *   Add an approved, additive Exam DB base-schema migration for completely fresh volumes.
    *   Integrate the external AI/payment mock URLs when their business flows are implemented.
    *   Define production backup scheduling and retention requirements; the current `backup` profile is manual and local-only.
