# LMS event contracts

The running services publish business notifications to one durable RabbitMQ topic exchange: `lms_events`.

Every current event uses this envelope:

```json
{
  "eventId": "UUID",
  "eventType": "EventName",
  "eventVersion": 1,
  "occurredAt": "2026-07-15T08:30:00.000Z",
  "source": "service-name",
  "data": {}
}
```

| Contract | Routing key | Producer |
|---|---|---|
| [UserLoggedInEvent](UserLoggedInEvent.md) | `user.loggedin` | User Service |
| [PaymentSucceededEvent](PaymentSucceededEvent.md) | `payment.succeeded` | Payment Service |
| [PaymentFailedEvent](PaymentFailedEvent.md) | `payment.failed` | Payment Service |
| [CourseAccessActivatedEvent](CourseAccessActivatedEvent.md) | `course.access.activated` | Course Service |

Messages are persistent and publishers use RabbitMQ confirms, but the current services do not have transactional outboxes. Publication is therefore confirmed best effort after the owning database transition, not an end-to-end at-least-once guarantee: a process failure between commit and publish can lose an event. Consumers must still deduplicate by `eventId` and keep business writes idempotent because retries or broker redelivery can duplicate a message. The synchronous, internally authenticated Payment-to-Course request remains the authoritative immediate course-access path; payment events do not create enrollment records.

Events never contain passwords, password hashes, JWTs, API keys, database credentials, internal-service secrets, or complete user profiles.
