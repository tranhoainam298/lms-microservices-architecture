# Exam & Quiz Database Design (Exam DB)

## Owner Service
**Exam & Quiz Service**

## Purpose
Store question bank, quizzes, answer keys, quiz attempts, submitted answers, and grading results.

---

## Tables

### 1. `question_bank`
- **Purpose**: A repository of reusable assessment questions.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the question.
  - `course_id` (UUID): Reference to the course this question belongs to (Note: Logical reference to Course Service; no database-level FK).
  - `question_text` (TEXT): The actual question prompt.
  - `question_type` (VARCHAR): Type of question (e.g., `single_choice`, `multiple_choice`, `true_false`, `short_answer`).
  - `options` (JSON): The list of possible options (for multiple/single choice).
  - `correct_answer` (TEXT/JSON): The correct answer or key used for grading.
  - `created_at` (TIMESTAMP): Creation timestamp.
- **Relationships**:
  - One-to-Many with `quiz_questions` (a question can be placed in multiple quizzes).
  - One-to-Many with `submitted_answers` (a question can have many submitted student answers).

### 2. `quizzes`
- **Purpose**: Defines assessment quizzes/exams within a course context.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the quiz.
  - `course_id` (UUID): Reference to the course (Note: Logical reference to Course Service; no database-level FK).
  - `title` (VARCHAR): Title of the quiz.
  - `description` (TEXT): Description or instructions for the quiz.
  - `passing_score` (INT): Minimum score required to pass.
  - `time_limit_minutes` (INT): Time limit in minutes.
  - `created_at` (TIMESTAMP): Creation timestamp.
- **Relationships**:
  - One-to-Many with `quiz_questions` (a quiz is composed of multiple questions).
  - One-to-Many with `quiz_attempts` (students can attempt a quiz multiple times).

### 3. `quiz_questions`
- **Purpose**: Junction table linking quizzes to questions in the question bank, establishing the sequence/order.
- **Main Fields**:
  - `quiz_id` (UUID, Foreign Key referencing `quizzes(id)`): The quiz.
  - `question_id` (UUID, Foreign Key referencing `question_bank(id)`): The question.
  - *Composite Primary Key*: `(quiz_id, question_id)`.
  - `sequence_order` (INT): The order in which the question appears in the quiz.
- **Relationships**:
  - Many-to-One with `quizzes`.
  - Many-to-One with `question_bank`.

### 4. `quiz_attempts`
- **Purpose**: Tracks student attempts on specific quizzes.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the attempt.
  - `student_id` (UUID): Reference to the student (Note: Logical reference to User Service; no database-level FK).
  - `quiz_id` (UUID, Foreign Key referencing `quizzes(id)`): The quiz being taken.
  - `attempt_number` (INT): The student's attempt counter (e.g., attempt 1, 2).
  - `status` (VARCHAR): Status of the attempt (e.g., `in_progress`, `submitted`, `abandoned`).
  - `started_at` (TIMESTAMP): When the student started the quiz.
  - `submitted_at` (TIMESTAMP, Nullable): When the student submitted their answers.
- **Relationships**:
  - Many-to-One with `quizzes`.
  - One-to-Many with `submitted_answers` (an attempt records answers for each question).
  - One-to-One with `grading_results` (an attempt results in exactly one final grading output).

### 5. `submitted_answers`
- **Purpose**: Stores student responses to individual questions within a specific quiz attempt.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier.
  - `attempt_id` (UUID, Foreign Key referencing `quiz_attempts(id)`): The specific attempt.
  - `question_id` (UUID, Foreign Key referencing `question_bank(id)`): The question answered.
  - `submitted_answer` (TEXT/JSON): Raw response text or option IDs selected by the student.
  - `is_correct` (BOOLEAN): Flag indicating if the grading algorithm marked it correct.
  - `score` (INT): Score earned for this individual question.
- **Relationships**:
  - Many-to-One with `quiz_attempts`.
  - Many-to-One with `question_bank`.

### 6. `grading_results`
- **Purpose**: Stores the final grading outcome, feedback, and pass/fail evaluation for an attempt. Replaces a separate Learning Result DB.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier.
  - `attempt_id` (UUID, Foreign Key referencing `quiz_attempts(id)`, Unique): The attempt being graded.
  - `final_score` (INT): Overall score obtained by the student.
  - `passed` (BOOLEAN): Indicates if the final score met the quiz's `passing_score`.
  - `feedback` (TEXT, Nullable): Automatic or instructor-entered feedback.
  - `graded_at` (TIMESTAMP): When the grading was finalized.
- **Relationships**:
  - One-to-One with `quiz_attempts`.
