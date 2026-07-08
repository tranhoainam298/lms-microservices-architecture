# API Contracts

All client requests (Web Client, Mobile Client) go through the **API Gateway** before reaching any backend service. The API Gateway handles routing, JWT validation, and rate limiting.

API contracts define the **request/response format only** — they do not contain implementation code. Each contract specifies:

- The HTTP endpoint
- The owner service responsible for handling the request
- The database that stores the data
- Request and response field definitions
- Error response definitions
- Related sequence diagram references

## Contract Files

| File | Endpoint(s) | Owner Service | Database |
|---|---|---|---|
| [auth-api.md](auth-api.md) | POST /auth/login | User Service | User DB |
| [course-api.md](course-api.md) | POST /courses/draft, GET /lessons/{lessonId}, POST /learning-progress | Course Service | Course DB |
| [exam-api.md](exam-api.md) | GET /quizzes/{quizId}, POST /quizzes/{quizId}/submit | Exam & Quiz Service | Exam DB |
| [payment-api.md](payment-api.md) | POST /payments | Payment Service | Payment DB |
| [reporting-api.md](reporting-api.md) | GET /reports/revenue | Payment Service + Course Service | Payment DB + Course DB |
| [ai-support-api.md](ai-support-api.md) | POST /ai/question | Course Service | Course DB |

## Important Rules

- No service accesses another service's database directly.
- Cross-service communication uses the **Message Broker** (event-driven) or synchronous API calls through the API Gateway.
- Payment Service must request Course Service to activate course access only after successful payment.
- Reporting data is aggregated from existing services (Payment Service, Course Service). There is no separate Reporting Service or Reporting DB.
- AI support routes through Course Service to the external AI Chatbot System. There is no separate Chatbot Service or Chatbot DB.
