# CourseAccessActivatedEvent

- Exchange: `lms_events` (durable topic)
- Routing key: `course.access.activated`
- Producer: Course Service
- Current consumers: asynchronous audit/demo subscribers
- Delivery: persistent publish with confirm after the Course DB transaction commits

```json
{
  "eventId": "84aceea0-1da4-40a1-aa21-bdc93cc89d7d",
  "eventType": "CourseAccessActivatedEvent",
  "eventVersion": 1,
  "occurredAt": "2026-07-15T08:35:01.000Z",
  "source": "course-service",
  "data": {
    "studentId": 101,
    "courseId": 208,
    "enrollmentId": 701,
    "activatedAt": "2026-07-15T08:35:01.000Z"
  }
}
```

Course DB enforces one enrollment per `(student_id, course_id)`. An already-active enrollment returns successfully without another event. Consumers deduplicate by `eventId`. No JWT, payment data, database credentials, or internal secret is allowed.
