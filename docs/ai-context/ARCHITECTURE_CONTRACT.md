# Architecture Contract

This document outlines the authoritative design system boundaries, core components, databases, and external integration points.

## System Boundaries

### Core Clients
*   `web-client` (Vite-based Single Page App)
*   `mobile-client` (Placeholder structure)

### Single Entry Point
*   `api-gateway`: Port 3000. Proxies requests to internal services, handles rate limiting, and does JWT token validation.

### Approved Core Microservices
1.  `user-service`: Port 5001. User profiles, identity, credentials, role checks.
2.  `course-service`: Port 5002. Draft and published courses, lessons, enrollment progress, context aggregations.
3.  `exam-service`: Port 5003. Question bank, quiz composition, grading, exam results.
4.  `payment-service`: Port 5004. Subscriptions, webhooks, transaction tracking.

### Approved Databases (Database-Per-Service)
1.  **User DB (`lms_user_db` on Port 3316)**: Owned by `user-service`.
2.  **Course DB (`lms_course_db` on Port 3317)**: Owned by `course-service`.
3.  **Exam DB (`lms_exam_db` on Port 3308)**: Owned by `exam-service`.
4.  **Payment DB (`lms_payment_db` on Port 3309)**: Owned by `payment-service`.

### Shared Infrastructure
*   **RabbitMQ**: Port 5672 (management on 15672). Event-driven enrollment trigger.
*   **Docker / Docker Compose**: Standard database and message broker orchestrator.
*   **Monitoring & Backup**: Database backup configs and health check scripts.

### External Systems (Isolated)
*   **ZaloPay/Momo Payment Gateway**: External webhook source.
*   **AI Chatbot System**: External real-provider adapter for enrolled lesson questions. Its compatibility path remains `external-systems/ai-chatbot-system/mock-provider`; runtime answers are not mocked.

## Forbidden Systems (DO NOT CREATE)
*   *Services:* `ai-service` (internal), `chatbot-service`, `reporting-service`, `analytics-service`, `notification-service`, `email-service`, `enrollment-service`, `learning-progress-service`.
*   *Databases:* `AI DB`, `Chatbot DB`, `Reporting DB`, `Analytics DB`, `Notification DB`, `Enrollment DB`, `Learning Result DB`, `Progress DB`.
