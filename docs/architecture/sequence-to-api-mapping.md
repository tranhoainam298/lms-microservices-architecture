# Sequence Diagram to API Mapping

This document maps each sequence diagram to its corresponding API endpoint(s), owner service, database, and external system.

| Sequence Diagram | API Endpoint | Owner Service | Database | External System |
|---|---|---|---|---|
| Account Management: Login | POST /auth/login | User Service | User DB | Message Broker |
| Course Management: Save Draft Course | POST /courses/draft | Course Service | Course DB | None |
| Learning Management: View Lesson | GET /lessons/{lessonId} | Course Service | Course DB | None |
| Exam Management: Take Quiz | GET /quizzes/{quizId}, POST /quizzes/{quizId}/submit | Exam & Quiz Service | Exam DB | None |
| Payment Management: Pay for Course | POST /payments | Payment Service + Course Service | Payment DB + Course DB | Payment Gateway ZaloPay/Momo |
| Reporting Management: View Revenue Report | GET /reports/revenue | Payment Service + Course Service | Payment DB + Course DB | None |
| AI Support: Ask Learning Question | POST /ai/question | Course Service | Course DB | AI Chatbot System |

## Notes

- All endpoints are accessed through the **API Gateway** as the single entry point.
- **Payment Management** involves two services: Payment Service processes the payment, then requests Course Service to activate access.
- **Reporting Management** aggregates data from Payment Service and Course Service. There is no separate Reporting Service or Reporting DB.
- **AI Support** routes through Course Service to the external AI Chatbot System. There is no separate Chatbot Service or Chatbot DB.
- **Message Broker** is listed as an external system for Login because the `UserLoggedInEvent` is published after successful authentication.
