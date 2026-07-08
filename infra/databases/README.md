# Database Schema Configurations

This directory contains the SQL schema definitions for the four microservice databases of the LMS platform.

---

## Directory Layout

* **[user-db/schema.sql](file:///D:/github%20tool/lms-microservices-architecture/infra/databases/user-db/schema.sql)**: SQL Server tables mapping account, profile, role, and login audit tables owned by the **User Service**.
* **[course-db/schema.sql](file:///D:/github%20tool/lms-microservices-architecture/infra/databases/course-db/schema.sql)**: SQL Server tables mapping courses, lessons, active access controls, learning progress, and AI contexts owned by the **Course Service**.
* **[exam-db/schema.sql](file:///D:/github%20tool/lms-microservices-architecture/infra/databases/exam-db/schema.sql)**: SQL Server tables mapping questions, quizzes, junctions, attempts, submitted answers, and grading results owned by the **Exam & Quiz Service**.
* **[payment-db/schema.sql](file:///D:/github%20tool/lms-microservices-architecture/infra/databases/payment-db/schema.sql)**: SQL Server tables mapping orders, transaction attempts, gateway logs, and recognized revenue logs owned by the **Payment Service**.

---

## Architectural Rules

1. **Database per Service Isolation**: Each database belongs to exactly one service. No cross-service SQL connections, views, or joints are permitted.
2. **Forbidden Cross-Database Foreign Keys**: Database-level foreign keys cannot cross service boundaries. For example, the `course_access` table in **Course DB** references `user_id` from the User Service, but must store it as a plain `BIGINT` column without a physical SQL foreign key pointing to the `users` table in **User DB**.
3. **Logical External References**:
   - The original entity owner holds the authoritative schema and write controls for its data.
   - Other services reference these entities by storing their primary IDs (e.g., `user_id`, `course_id`, `instructor_id`) logically. The mapping and verification of these IDs are managed via synchronous API endpoints or asynchronous RabbitMQ event flows.
