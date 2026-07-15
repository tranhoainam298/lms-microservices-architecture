# MySQL Schema Mapping

This mapping reflects the current fresh Docker bootstrap SQL and additive owner-service migration checks.

| Database | Owner service | Fresh schema file | Current tables | Logical external IDs |
|---|---|---|---|---|
| User DB (`lms_user_db`) | User Service | `infra/mysql-init/init-user-db.sql` | `users`, `login_audit` | none |
| Course DB (`lms_course_db`) | Course Service | `infra/mysql-init/init-course-db.sql` | `courses`, `lessons`, `enrollments`, `lesson_progress` | `courses.instructor_id`, `enrollments.student_id`, `lesson_progress.student_id` refer logically to User Service IDs |
| Exam DB (`lms_exam_db`) | Exam & Quiz Service | `infra/mysql-init/init-exam-db.sql` | `quizzes`, `questions`, `quiz_results` | `CourseId` refers logically to Course Service; `InstructorId` and `StudentId` refer logically to User Service identities |
| Payment DB (`lms_payment_db`) | Payment Service | `infra/mysql-init/init-payment-db.sql` | `transactions` | `student_id` refers logically to User Service; `course_id` refers logically to Course Service |

All entity identifiers in the current schemas are integer IDs (`INT`, with `login_audit.id` using `BIGINT UNSIGNED`).

## Owner-controlled additive compatibility

- Course Service ensures `lessons.content`, the unique enrollment key, and `lesson_progress` exist through non-destructive checks in `course-service/src/data/`.
- Exam Service checks required columns, question/result constraints, and the unique student/quiz result index through `exam-service/Data/ExamSchemaMigrator.cs` and EF Core model configuration.
- These checks modify only the owning database and do not create cross-service database access.

## Relationship rules

- Foreign keys are used only inside a service-owned database: Course DB links lessons/progress/enrollments to courses and lessons; Exam DB links questions/results to quizzes; User DB links login audits to users.
- IDs representing another service's entity are logical references with no cross-database FK.
- Cross-service validation and enrichment occur through HTTP APIs or RabbitMQ events, never SQL joins across databases.
