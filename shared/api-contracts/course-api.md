# Course API Contract

**Owner service:** Course Service
**Database:** Course DB

Course Service handles courses, lessons, enrollment/access, progress, and learning context for AI.

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
| status | string | Yes | Must be `draft` in this step |
| instructorId | string | Yes | ID of the instructor creating the course |

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
| course.createdAt | string | Timestamp of creation |

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
