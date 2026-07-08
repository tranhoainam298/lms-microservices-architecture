# Course Database Design (Course DB)

## Owner Service
**Course Service**

## Purpose
Store courses, lessons, enrollments/access, learning progress, and AI learning context.

---

## Tables

### 1. `courses`
- **Purpose**: Stores information about courses offered on the platform.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the course.
  - `title` (VARCHAR): Title of the course.
  - `description` (TEXT): Detailed description of the course content.
  - `instructor_id` (UUID): Reference to the creator/instructor of the course (Note: This is a logical reference to a user in the User Service; no database-level foreign key constraint exists).
  - `price` (DECIMAL(10, 2)): Cost of purchasing the course.
  - `status` (VARCHAR): Publishing status (e.g., `draft`, `published`, `archived`).
  - `created_at` (TIMESTAMP): Time of course creation.
  - `updated_at` (TIMESTAMP): Time of last modification.
- **Relationships**:
  - One-to-Many with `lessons` (a course contains multiple lessons).
  - One-to-Many with `course_access` (a course has multiple access records for students).
  - One-to-Many with `learning_progress` (tracks student progress through lessons in this course).
  - One-to-Many with `ai_learning_context` (stores course-specific AI interaction histories).

### 2. `lessons`
- **Purpose**: Stores the lesson elements (content, sequence, links) that make up a course.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the lesson.
  - `course_id` (UUID, Foreign Key referencing `courses(id)`): The course this lesson belongs to.
  - `title` (VARCHAR): Title of the lesson.
  - `content_url` (VARCHAR): URL or storage path for the lesson material (e.g., video, document).
  - `sequence_order` (INT): Display order of the lesson within the course.
  - `created_at` (TIMESTAMP): Creation time.
  - `updated_at` (TIMESTAMP): Modification time.
- **Relationships**:
  - Many-to-One with `courses`.
  - One-to-Many with `learning_progress` (tracks whether students have completed this lesson).
  - One-to-Many with `ai_learning_context` (tracks lesson-specific AI context).

### 3. `course_access`
- **Purpose**: Tracks which students have access to which courses. Replaces a separate Enrollment DB.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the access record.
  - `student_id` (UUID): Reference to the student (Note: Logical reference to a user in User Service; no database-level FK constraint).
  - `course_id` (UUID, Foreign Key referencing `courses(id)`): The course being accessed.
  - `access_status` (VARCHAR): Current access state (e.g., `active`, `suspended`, `expired`).
  - `granted_at` (TIMESTAMP): When access was granted (typically after successful payment).
  - `expires_at` (TIMESTAMP, Nullable): Expiry timestamp if access is time-limited.
- **Relationships**:
  - Many-to-One with `courses`.

### 4. `learning_progress`
- **Purpose**: Tracks students' completion status for individual lessons and overall courses. Replaces a separate Learning Result DB.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier.
  - `student_id` (UUID): Reference to the student (Note: Logical reference to User Service).
  - `course_id` (UUID, Foreign Key referencing `courses(id)`): The course.
  - `lesson_id` (UUID, Foreign Key referencing `lessons(id)`): The specific lesson.
  - `status` (VARCHAR): Progress status (e.g., `not_started`, `in_progress`, `completed`).
  - `completed_at` (TIMESTAMP, Nullable): Time when the lesson was marked completed.
  - `updated_at` (TIMESTAMP): Time of last progress update.
- **Relationships**:
  - Many-to-One with `courses`.
  - Many-to-One with `lessons`.

### 5. `ai_learning_context`
- **Purpose**: Stores contextual learning data (e.g., AI chatbot chat history summaries, student difficulty notes) to feed into the external AI Chatbot System. Replaces a separate Chatbot DB.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier.
  - `student_id` (UUID): Reference to the student (Note: Logical reference to User Service).
  - `course_id` (UUID, Foreign Key referencing `courses(id)`): The course context.
  - `lesson_id` (UUID, Foreign Key referencing `lessons(id)`, Nullable): Specific lesson context if applicable.
  - `context_summary` (TEXT): Summarized interaction context or profile details relevant for AI responses.
  - `last_interaction_at` (TIMESTAMP): Time of last interaction.
  - `updated_at` (TIMESTAMP): Update timestamp.
- **Relationships**:
  - Many-to-One with `courses`.
  - Many-to-One with `lessons`.
