# API to Database Mapping

This document maps the primary API endpoints of the LMS system to their corresponding owner service, database, main tables, and operational notes.

---

## Mapping Table

| API Endpoint | Owner Service | Database | Main Tables | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **POST /auth/login** | User Service | User DB | `users`, `roles`, `user_roles`, `login_audit` | Login and role lookup. Publishes `UserLoggedInEvent` to the Message Broker upon success. |
| **POST /courses/draft** | Course Service | Course DB | `courses` | Saves a new course draft. |
| **GET /lessons/{lessonId}** | Course Service | Course DB | `lessons`, `course_access`, `learning_progress` | View lesson content. Checks student's active access status and tracks progress. |
| **POST /learning-progress** | Course Service | Course DB | `learning_progress` | Updates the completion status/progress of a lesson for a student. |
| **GET /quizzes/{quizId}** | Exam & Quiz Service | Exam DB | `quizzes`, `quiz_questions`, `question_bank` | Loads the quiz definition and its ordered list of questions. |
| **POST /quizzes/{quizId}/submit** | Exam & Quiz Service | Exam DB | `quiz_attempts`, `submitted_answers`, `grading_results` | Submits answers for a quiz attempt, grades the answers, and stores results. |
| **POST /payments** | Payment Service | Payment DB | `payments`, `payment_transactions`, `payment_gateway_logs` | Initiates the course purchase payment flow. Integrates with Momo/ZaloPay. |
| **GET /reports/revenue** | Payment Service + Course Service | Payment DB + Course DB | `revenue_records`, `courses` | Aggregates data from Payment DB and Course DB. No reporting service or Reporting DB exists. |
| **POST /ai/question** | Course Service | Course DB | `ai_learning_context`, `lessons` | Routes queries using lesson details and AI contexts to the external AI Chatbot System. No Chatbot DB exists. |

---

## Architectural Guidelines

1. **API Gateway Routing**: All external requests are routed via the API Gateway to their respective owner services.
2. **Dual-Database Queries**: Endpoints like `GET /reports/revenue` and `POST /payments` represent operations where a service (e.g., Payment Service) may coordinate with another service (e.g., Course Service) via API calls or event notifications to access their respective data stores. Direct connections across databases are strictly prohibited.
