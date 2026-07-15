# Exam and Quiz API Contract

**Owner:** Exam & Quiz Service

**Database:** Exam DB (`quizzes`, `questions`, `quiz_results`)

**Public base:** `/api/exams`

Every Exam API route requires a valid JWT. API Gateway and Exam Service both enforce the required role. Exam Service calls Course Service over HTTP for course ownership/access and never connects to Course DB.

## Instructor quiz management

Instructor identity comes from the JWT. Authoring is allowed only for the instructor's own draft course, except the result summary, which allows any status of an owned course.

| Method and public path | Purpose |
|---|---|
| `POST /api/exams/courses/:courseId/quizzes` | Create an owned draft quiz and questions; `201 { quiz }`. |
| `GET /api/exams/courses/:courseId/quizzes/mine` | List owned quizzes; `{ items, total }`. |
| `GET /api/exams/courses/:courseId/quizzes/:quizId/mine` | Load draft management detail including answer indices. |
| `POST /api/exams/courses/:courseId/quizzes/:quizId/questions` | Add one validated question to an owned draft quiz; `201 { question }`. |
| `GET /api/exams/courses/:courseId/quizzes/:quizId/questions/:questionId` | Load one owned draft question including its instructor-only answer index. |
| `PATCH /api/exams/courses/:courseId/quizzes/:quizId/questions/:questionId` | Update one owned draft question. |
| `DELETE /api/exams/courses/:courseId/quizzes/:quizId/questions/:questionId` | Delete one owned draft question; `{ deleted: true, questionId }`. |
| `PATCH /api/exams/courses/:courseId/quizzes/:quizId` | Replace editable draft metadata and its question set transactionally. |
| `DELETE /api/exams/courses/:courseId/quizzes/:quizId` | Delete one owned draft quiz; `{ deleted: true, quizId }`. |
| `PATCH /api/exams/courses/:courseId/quizzes/:quizId/publish` | Publish an owned ready draft quiz. |
| `GET /api/exams/courses/:courseId/results/summary` | Aggregate and list quiz attempts for an instructor-owned course. |
| `GET /api/exams/instructor/results/summary` | Aggregate quiz/attempt/pass data across quizzes owned by the JWT instructor. |

Create/update body:

```json
{
  "title": "Knowledge check",
  "description": "Optional description",
  "durationMinutes": 30,
  "passingScore": 60,
  "questions": [
    {
      "questionText": "Which option is correct?",
      "questionType": "single_choice",
      "options": ["A", "B"],
      "correctOptionIndex": 1,
      "points": 10
    }
  ]
}
```

Rules include title length 3–255, duration 1–300, passing score 0–100, 1–100 questions, 2–6 non-empty options, valid zero-based correct index, and positive points up to 100. The server assigns question order. Update replaces the draft's question rows inside a transaction; published quizzes cannot be edited/deleted through draft routes.

The management detail route is instructor-only and may return `correctOptionIndex`. Student routes never return it.

The explicit question CRUD routes accept the same validated single-question shape used inside `questions`: `questionText`, `questionType=single_choice`, `options`, `correctOptionIndex`, and `points`. They require both ownership of the draft course (verified through Course Service) and ownership of the draft quiz (verified in Exam DB). Cross-instructor, published-quiz, or mismatched course/quiz/question access is not exposed as an editable resource.

Result-summary success contains:

```json
{
  "courseId": 1,
  "summary": { "quizCount": 0, "attemptCount": 0, "passedCount": 0, "averagePercentage": 0 },
  "quizzes": [],
  "results": []
}
```

Exam Service verifies ownership through `GET /courses/:courseId/instructor-access` with the original JWT. Missing ownership returns `404 COURSE_NOT_FOUND`; Course Service failure returns `502 COURSE_SERVICE_UNAVAILABLE`.

The instructor-wide endpoint returns:

```json
{
  "summary": {
    "quizCount": 0,
    "publishedQuizCount": 0,
    "draftQuizCount": 0,
    "attemptCount": 0,
    "passedCount": 0,
    "averagePercentage": 0
  },
  "recentResults": []
}
```

`recentResults` contains at most ten attempts and only Exam DB values required by the Instructor dashboard: result/quiz/course/student identifiers, quiz title, percentage, passed state, and submission time.

## Student quiz flow

Student identity comes exclusively from the JWT. Course access is checked through Course Service using the same JWT before quiz data or grading is returned.

### `GET /api/exams/courses/:courseId/quizzes`

Returns `{ items, total }` for published quizzes after Course Service confirms an active enrollment in a published course. Each item has quiz metadata and `questionCount`, not answer keys.

### `GET /api/exams/quizzes/:quizId`

Exam Service loads the published quiz to obtain its real `courseId`, calls `GET /courses/:courseId/student-exam-access`, then returns:

```json
{
  "quiz": {
    "id": 1,
    "courseId": 1,
    "title": "...",
    "description": "...",
    "durationMinutes": 30,
    "passingScore": 60,
    "questions": [
      {
        "id": 10,
        "questionText": "...",
        "questionType": "single_choice",
        "options": ["A", "B"],
        "points": 10,
        "sequenceOrder": 1
      }
    ]
  }
}
```

The response never contains `CorrectAnswer`, `correctAnswer`, `CorrectOptionIndex`, `correctOptionIndex`, or `answerKey`.

### `POST /api/exams/quizzes/:quizId/submit`

```json
{
  "answers": [
    { "questionId": 10, "selectedOptionIndex": 1 }
  ]
}
```

The browser does not send authoritative `studentId`, score, maximum score, percentage, passed state, or submission time. Exam Service validates question/option IDs, rejects duplicate question IDs, reloads answer keys from Exam DB, grades server-side, and creates one result per student/quiz.

Success: `201 { result }`, where result fields are `id`, `quizId`, JWT-derived `studentId`, `score`, `maximumScore`, `percentage`, `passed`, and `submittedAt`. Correct answers and per-question answer keys are not returned.

Main errors:

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_QUIZ_ID` / `VALIDATION_ERROR` | Bad route ID or answer payload. |
| 403 | `COURSE_ACCESS_REQUIRED` | Course unpublished or student not actively enrolled. |
| 404 | `QUIZ_NOT_FOUND` | Published quiz not found. |
| 409 | `QUIZ_ALREADY_SUBMITTED` | The unique student/quiz result already exists. |
| 502 | `COURSE_SERVICE_UNAVAILABLE` | Course access could not be verified. |

### Results

| Method and public path | Behavior |
|---|---|
| `GET /api/exams/results/mine` | Returns `{ summary, items, total }` for the JWT student. Historical result access does not recheck current enrollment. |
| `GET /api/exams/results/:resultId` | Returns `200 { result }` only when the result belongs to the JWT student; otherwise privacy-preserving `404 RESULT_NOT_FOUND`. |

The `results/mine` summary is calculated in Exam Service from the JWT student's Exam DB rows:

```json
{
  "summary": {
    "totalAttempts": 0,
    "passedAttempts": 0,
    "averagePercentage": 0,
    "latestScore": 0
  },
  "items": [],
  "total": 0
}
```

## Authorization summary

- Missing/invalid token: `401 UNAUTHORIZED` or `401 INVALID_TOKEN`.
- Wrong role: `403 FORBIDDEN`.
- Browser identity headers/body fields cannot override JWT identity.
- Instructor ownership and student access are checked by Course Service REST, not a cross-database query.

Legacy Gateway route groups `/quizzes` and `/questions` return `410 ENDPOINT_DEPRECATED`; all active quiz operations use `/api/exams/...`.
