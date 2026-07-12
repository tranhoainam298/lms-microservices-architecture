# Course API Contract

**Owner service:** Course Service
**Database:** Course DB

Course Service handles courses, lessons, enrollment/access, progress, and learning context for AI.

## POST /courses/lessons/{lessonId}/ai/ask

Asks for learning help about one unlocked lesson.

```http
POST /courses/lessons/{lessonId}/ai/ask
Authorization: Bearer {studentAccessToken}
Content-Type: application/json

{ "question": "Explain this lesson in simple words" }
```

- Requires a verified student JWT and active enrollment in the lesson's published course.
- `studentId` comes only from the verified JWT and is never accepted from the request body.
- Course Service loads the course title, description, lesson title, resource metadata, and saved course progress from Course DB.
- Course Service sends only the question and learning context to the External AI Chatbot System.
- The external system calls the configured real AI provider with a server-side key. The key is never returned to Course Service or the browser.

Success response:

```json
{
  "answer": "...",
  "model": "gpt-4o-mini",
  "provider": "openai",
  "usage": { "inputTokens": null, "outputTokens": null }
}
```

Errors include `VALIDATION_ERROR` (400), `COURSE_ACCESS_REQUIRED` (403), `LESSON_NOT_FOUND` (404), `AI_PROVIDER_NOT_CONFIGURED` (503), and safe 502 AI availability/response errors.

## Internal payment integration

Payment Service uses two server-to-server endpoints protected by `X-Internal-Service-Secret`:

- `GET /courses/internal/purchasable/{courseId}` returns only a published course's trusted ID, title, price, and status.
- `POST /courses/internal/enrollments/activate` accepts `{ studentId, courseId }`, verifies the course is published, and transactionally activates or creates the Course DB enrollment.

These endpoints are not browser enrollment shortcuts. Activation is idempotent and Course Service never accesses Payment DB.

---

## POST /courses/draft

**Entry point:** API Gateway

### Description

Saves a new course as a draft. Only instructors can create course drafts.

### Request

```
POST /courses/draft
Content-Type: application/json
Authorization: Bearer {accessToken}
```

| Field | Type | Required | Description |
|---|---|---|---|
| title | string | Yes | Course title |
| description | string | Yes | Course description |
| price | number | Yes | Course price, greater than or equal to 0 |
| status | string | No (Ignored) | Deprecated. Automatically forced to `draft` by the backend |
| instructorId | string | No (Ignored) | Deprecated. Derived solely from the verified JWT token |
| lessons | array | No | Optional array of initial lessons to insert atomically |
| lessons[].title | string | Yes | Title of the lesson |
| lessons[].videoUrl | string | No | URL of the lesson video |
| lessons[].documentUrl | string | No | URL of the lesson document |
| lessons[].orderIndex | number | No | The sequence order index for this lesson |

### Success Response (201 Created)

| Field | Type | Description |
|---|---|---|
| course | object | Created draft course |
| course.id | string | Generated course draft ID |
| course.title | string | Course title |
| course.description | string | Course description |
| course.price | number | Course price |
| course.status | string | Course status (`draft`) |
| course.instructorId | string | Instructor ID |
| course.lessons | array | Saved initial lessons |
| course.lessons[].id | number | Generated lesson ID |
| course.lessons[].courseId | number | Parent course ID |
| course.lessons[].title | string | Lesson title |
| course.lessons[].videoUrl | string | Lesson video URL |
| course.lessons[].documentUrl | string | Lesson document URL |
| course.lessons[].orderIndex | number | Lesson sequence order index |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 403 | FORBIDDEN | User does not have instructor role |
| 400 | VALIDATION_ERROR | Draft payload is invalid |

### Related Sequence Diagram

**Sequence Diagram — Course Management: Save Draft Course**

---

## GET /lessons/{lessonId}

**Entry point:** API Gateway

### Description

Retrieves lesson content for a student. The student must have active enrollment/access to the course containing this lesson.

### Request

```
GET /lessons/{lessonId}
Authorization: Bearer {accessToken}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| lessonId | string (path) | Yes | ID of the lesson to retrieve |

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| lessonId | string | Lesson ID |
| courseId | string | Parent course ID |
| title | string | Lesson title |
| content | object | Lesson content (text, video URL, attachments) |
| order | integer | Lesson order within the course |
| completionStatus | string | Student's completion status for this lesson |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 403 | ACCESS_DENIED | Student does not have active access to this course |
| 404 | NOT_FOUND | Lesson does not exist |

### Related Sequence Diagram

**Sequence Diagram — Learning Management: View Lesson**

---

## POST /learning-progress

**Entry point:** API Gateway

### Description

Records a student's learning progress for a specific lesson. When a lesson is completed, a `LessonCompletedEvent` is published.

### Request

```
POST /learning-progress
Content-Type: application/json
Authorization: Bearer {accessToken}
```

| Field | Type | Required | Description |
|---|---|---|---|
| studentId | string | Yes | ID of the student |
| courseId | string | Yes | ID of the course |
| lessonId | string | Yes | ID of the lesson |
| progressPercent | integer | Yes | Progress percentage (0–100) |
| completed | boolean | Yes | Whether the lesson is marked as completed |

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| studentId | string | Student ID |
| courseId | string | Course ID |
| lessonId | string | Lesson ID |
| progressPercent | integer | Updated progress percentage |
| completed | boolean | Completion status |
| updatedAt | string | Timestamp of update |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 403 | ACCESS_DENIED | Student does not have active access to this course |
| 404 | NOT_FOUND | Lesson or course does not exist |
