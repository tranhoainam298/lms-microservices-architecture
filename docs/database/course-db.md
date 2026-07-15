# Course DB

## Ownership

- **Owner:** Course Service
- **MySQL database:** `lms_course_db`
- **Fresh-schema source:** `infra/mysql-init/init-course-db.sql`
- **Additive runtime schema checks:** `course-service/src/data/migrateLessonContent.js`, `migrateEnrollmentUniqueness.js`, and `migrateLessonProgress.js`

Only Course Service connects to this database. `instructor_id` and `student_id` are logical references to identities owned by User Service; Course DB has no connection or foreign key to User DB.

## Tables

### `courses`

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `title` | `VARCHAR(255)` | `NOT NULL` |
| `description` | `TEXT` | nullable |
| `category` | `VARCHAR(255)` | nullable |
| `price` | `DECIMAL(10,2)` | defaults to `0.00` |
| `cover_image` | `VARCHAR(255)` | nullable |
| `instructor_id` | `INT` | `NOT NULL`; logical User Service reference |
| `status` | `VARCHAR(50)` | defaults to `draft`; published catalog queries require `published` |
| `created_at` | `TIMESTAMP` | defaults to the current timestamp |
| `updated_at` | `TIMESTAMP` | defaults to the current timestamp and updates automatically |

### `lessons`

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `course_id` | `INT` | `NOT NULL`, FK to `courses(id)` with `ON DELETE CASCADE` |
| `title` | `VARCHAR(255)` | `NOT NULL` |
| `content` | `LONGTEXT` | nullable lesson text |
| `video_url` | `VARCHAR(255)` | nullable |
| `document_url` | `VARCHAR(255)` | nullable |
| `order_index` | `INT` | defaults to `0` |
| `created_at` | `TIMESTAMP` | defaults to the current timestamp |

### `enrollments`

Stores course-level access and aggregate progress.

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `student_id` | `INT` | `NOT NULL`; logical User Service reference |
| `course_id` | `INT` | `NOT NULL`, FK to `courses(id)` with `ON DELETE CASCADE` |
| `progress_percent` | `DECIMAL(5,2)` | defaults to `0.00` |
| `status` | `VARCHAR(50)` | defaults to `active` |
| `enrolled_at` | `TIMESTAMP` | defaults to the current timestamp |

`uq_enrollments_student_course (student_id, course_id)` makes access activation idempotent and prevents duplicate enrollment rows.

### `lesson_progress`

Stores durable per-lesson completion.

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `student_id` | `INT` | `NOT NULL`; logical User Service reference |
| `course_id` | `INT` | `NOT NULL`, FK to `courses(id)` with `ON DELETE CASCADE` |
| `lesson_id` | `INT` | `NOT NULL`, FK to `lessons(id)` with `ON DELETE CASCADE` |
| `status` | `VARCHAR(30)` | `NOT NULL`, defaults to `completed` |
| `completed_at` | `TIMESTAMP` | nullable, defaults to the current timestamp |
| `created_at` | `TIMESTAMP` | defaults to the current timestamp |
| `updated_at` | `TIMESTAMP` | defaults to the current timestamp and updates automatically |

The unique key `uq_lesson_progress_student_course_lesson (student_id, course_id, lesson_id)` makes repeated completion requests idempotent. Additional indexes cover `course_id` and `lesson_id`.

## Runtime responsibilities

- Course Service verifies active enrollment before returning protected lesson content or AI learning context.
- Lesson completion is inserted into `lesson_progress`; Course Service recalculates and updates `enrollments.progress_percent`.
- Payment Service obtains course metadata and requests enrollment activation through internally authenticated Course Service APIs. Course Service performs the authoritative synchronous, idempotent write to `enrollments`.
- After a newly activated enrollment is committed, Course Service publishes `CourseAccessActivatedEvent`. The event is architectural notification, not a second enrollment-write path.
- AI question context is assembled transiently from `courses`, `lessons`, `enrollments`, and `lesson_progress`, then sent to the external AI Chatbot System. It is not persisted in a chatbot-specific table or database.
