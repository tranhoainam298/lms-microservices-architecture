# Exam DB

## Ownership

- **Owner:** Exam & Quiz Service
- **MySQL database:** `lms_exam_db`
- **Fresh-schema source:** `infra/mysql-init/init-exam-db.sql`
- **Runtime compatibility checks:** `exam-service/Data/ExamSchemaMigrator.cs` and EF Core model configuration in `exam-service/Data/ExamDbContext.cs`

Only Exam Service connects to Exam DB. Course publication, instructor ownership, and student enrollment are verified through Course Service HTTP APIs; Exam Service never connects to Course DB.

## Tables

### `quizzes`

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `Id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `CourseId` | `INT` | `NOT NULL`; logical Course Service reference |
| `InstructorId` | `INT` | `NOT NULL`; identity derived from a verified JWT |
| `Title` | `VARCHAR(255)` | `NOT NULL` |
| `Description` | `LONGTEXT` | nullable |
| `TimeLimitMinutes` | `INT` | `NOT NULL`, defaults to `30` |
| `PassingScore` | `INT` | `NOT NULL`, defaults to `60` |
| `Status` | `VARCHAR(20)` | `NOT NULL`, defaults to `draft` |
| `CreatedAt` | `DATETIME(6)` | `NOT NULL`, defaults to the current timestamp |
| `UpdatedAt` | `DATETIME(6)` | `NOT NULL`, updates automatically |

### `questions`

Questions are owned directly by one quiz; there is no separate reusable question-bank junction schema.

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `Id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `CourseId` | `INT` | `NOT NULL`; logical Course Service reference |
| `QuizId` | `INT` | `NOT NULL`, FK to `quizzes(Id)` with `ON DELETE CASCADE` |
| `Topic` | `VARCHAR(255)` | `NOT NULL` |
| `Content` | `LONGTEXT` | `NOT NULL` |
| `Options` | `JSON` | `NOT NULL` |
| `CorrectAnswer` | `VARCHAR(255)` | `NOT NULL`; server-side answer key |
| `Difficulty` | `VARCHAR(50)` | `NOT NULL`, defaults to `medium` |
| `Points` | `DECIMAL(10,2)` | `NOT NULL`, defaults to `1.00` |
| `OrderIndex` | `INT` | `NOT NULL`, defaults to `1` |
| `CreatedAt` | `DATETIME(6)` | `NOT NULL`, defaults to the current timestamp |

Student quiz-read APIs project safe question DTOs and do not return `CorrectAnswer`.

### `quiz_results`

Stores one server-graded submission per student and quiz.

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `Id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `StudentId` | `INT` | `NOT NULL`; identity derived from a verified JWT |
| `QuizId` | `INT` | `NOT NULL`, FK to `quizzes(Id)` with `ON DELETE CASCADE` |
| `Score` | `DECIMAL(10,2)` | `NOT NULL`, defaults to `0` |
| `MaximumScore` | `DECIMAL(10,2)` | `NOT NULL`, defaults to `0` |
| `Percentage` | `DECIMAL(5,2)` | `NOT NULL`, defaults to `0` |
| `Passed` | `TINYINT(1)` | `NOT NULL`, defaults to `0` |
| `SubmittedAnswers` | `JSON` | `NOT NULL` |
| `SubmittedAt` | `DATETIME(6)` | `NOT NULL`, defaults to the current timestamp |

`UX_quiz_results_StudentId_QuizId (StudentId, QuizId)` prevents duplicate submissions under the current one-attempt policy.

## Runtime responsibilities

Exam Service loads the answer key internally, calculates score, maximum score, percentage, and pass/fail, then persists the result in `quiz_results`. Client-supplied score, pass state, or student identity is never authoritative.

These three tables are the complete current Exam DB schema; question content and result data are stored directly in them.
