# Course Events

**Publisher:** Course Service
**Channel:** Message Broker

---

## CourseDraftSavedEvent

Published when an instructor saves a new course draft.

### Payload

| Field | Type | Description |
|---|---|---|
| eventId | string | Unique event instance identifier |
| courseId | string | ID of the course draft |
| instructorId | string | ID of the instructor who created the draft |
| title | string | Course title |
| status | string | Course status ("draft") |
| occurredAt | string | ISO 8601 timestamp of creation |

### Triggered By

- `POST /courses/draft` — successful draft creation

---

## CourseAccessActivatedEvent

Published when a student's course access is activated after successful payment.

### Payload

| Field | Type | Description |
|---|---|---|
| eventId | string | Unique event instance identifier |
| courseId | string | ID of the course |
| userId | string | ID of the student who gained access |
| activatedBy | string | Source of activation ("payment") |
| occurredAt | string | ISO 8601 timestamp of activation |

### Triggered By

- Payment Service request to Course Service after `PaymentSucceededEvent`

---

## LessonCompletedEvent

Published when a student completes a lesson (progressPercent = 100 and completed = true).

### Payload

| Field | Type | Description |
|---|---|---|
| eventId | string | Unique event instance identifier |
| courseId | string | ID of the course |
| lessonId | string | ID of the completed lesson |
| studentId | string | ID of the student who completed the lesson |
| occurredAt | string | ISO 8601 timestamp of completion |

### Triggered By

- `POST /learning-progress` — when completed = true
