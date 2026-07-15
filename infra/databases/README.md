# Database Schema Compatibility Pointers

The executable LMS uses MySQL 8. Canonical fresh-volume schemas and seed data live in [`infra/mysql-init`](../mysql-init/) and are mounted by `docker-compose.yml`:

| Owner | Database | Canonical schema |
| :--- | :--- | :--- |
| User Service | `lms_user_db` | [`init-user-db.sql`](../mysql-init/init-user-db.sql) |
| Course Service | `lms_course_db` | [`init-course-db.sql`](../mysql-init/init-course-db.sql) |
| Exam & Quiz Service | `lms_exam_db` | [`init-exam-db.sql`](../mysql-init/init-exam-db.sql) |
| Payment Service | `lms_payment_db` | [`init-payment-db.sql`](../mysql-init/init-payment-db.sql) |

The four nested `schema.sql` files are retained only as non-executable compatibility pointers for older repository links. They intentionally contain comments only so a second schema source cannot drift from the Docker bootstrap.

No service connects to another service's database. Logical IDs such as `student_id`, `course_id`, and `instructor_id` cross boundaries through authenticated APIs or documented events, never cross-database foreign keys or joins. The exact table catalog is documented in [`docs/database`](../../docs/database/README.md).
