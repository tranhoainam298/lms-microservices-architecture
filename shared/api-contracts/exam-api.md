# Exam API Contract

**Owner service:** Exam & Quiz Service
**Database:** Exam DB

Exam DB stores the question bank, answer keys, grading results, and quiz metadata.

---

## GET /quizzes/{quizId}

**Entry point:** API Gateway

### Description

Retrieves quiz details and questions for a student to take. The student must have active access to the course associated with this quiz.

### Request

```
GET /quizzes/{quizId}
Authorization: Bearer {accessToken}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| quizId | string (path) | Yes | ID of the quiz to retrieve |

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| quizId | string | Quiz ID |
| courseId | string | Associated course ID |
| title | string | Quiz title |
| description | string | Quiz description |
| timeLimit | integer | Time limit in minutes (0 = no limit) |
| questions | array | List of questions (id, text, type, options) |
| totalPoints | integer | Maximum points for the quiz |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 403 | ACCESS_DENIED | Student does not have active access to this course |
| 404 | NOT_FOUND | Quiz does not exist |

### Related Sequence Diagram

**Sequence Diagram — Exam Management: Take Quiz**

---

## POST /quizzes/{quizId}/submit

**Entry point:** API Gateway

### Description

Submits a student's answers for grading. The Exam & Quiz Service grades the submission against the answer keys stored in Exam DB and returns the result.

### Request

```
POST /quizzes/{quizId}/submit
Content-Type: application/json
Authorization: Bearer {accessToken}
```

| Field | Type | Required | Description |
|---|---|---|---|
| quizId | string (path) | Yes | ID of the quiz being submitted |
| studentId | string | Yes | ID of the student submitting |
| answers | array | Yes | List of answers (questionId, selectedOption or freeText) |
| submittedAt | string | Yes | Timestamp of submission |

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| quizId | string | Quiz ID |
| studentId | string | Student ID |
| score | integer | Total score achieved |
| totalPoints | integer | Maximum possible points |
| passed | boolean | Whether the student passed |
| gradedAnswers | array | Per-question results (questionId, correct, pointsAwarded) |
| gradedAt | string | Timestamp of grading |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 403 | ACCESS_DENIED | Student does not have active access to this course |
| 404 | NOT_FOUND | Quiz does not exist |
| 409 | ALREADY_SUBMITTED | Student has already submitted this quiz |

### Related Sequence Diagram

**Sequence Diagram — Exam Management: Take Quiz**
