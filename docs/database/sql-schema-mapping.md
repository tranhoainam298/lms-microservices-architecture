# SQL Schema Mapping

This document maps each of the 4 microservice databases to its owner service, physical SQL Server schema file, logical tables, and external ID references.

---

## SQL Schema Mapping Table

| Database | Owner Service | Schema File | Tables | External IDs |
| :--- | :--- | :--- | :--- | :--- |
| **User DB** | User Service | `infra/databases/user-db/schema.sql` | `users`, `roles`, `user_roles`, `login_audit` | None |
| **Course DB** | Course Service | `infra/databases/course-db/schema.sql` | `courses`, `lessons`, `course_access`, `learning_progress`, `ai_learning_context` | `user_id`, `instructor_id` |
| **Exam DB** | Exam & Quiz Service | `infra/databases/exam-db/schema.sql` | `question_bank`, `quizzes`, `quiz_questions`, `quiz_attempts`, `submitted_answers`, `grading_results` | `user_id`, `course_id` |
| **Payment DB** | Payment Service | `infra/databases/payment-db/schema.sql` | `payments`, `payment_transactions`, `payment_gateway_logs`, `revenue_records` | `user_id`, `course_id` |

---

## Architectural Rules

1. **Owner Exclusivity**: A service has exclusive schema, read, and write controls over its respective database schema. No cross-service SQL connections are permitted.
2. **Logical Joins**: Fields classified as *External IDs* (e.g., `user_id`, `course_id`, `instructor_id`) act as logical foreign keys. They reference entities owned by external services but are stored without active, database-enforced SQL foreign key constraints to support total database isolation.
