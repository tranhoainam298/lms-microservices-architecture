# Event Contracts

Events are published to the **Message Broker** for asynchronous, event-driven communication between services. Each event follows a standard structure with an `eventId` and `occurredAt` timestamp.

Event contracts define the **event name and payload fields only** — they do not contain implementation code.

## Event Contract Files

| File | Events | Publisher |
|---|---|---|
| [user-events.md](user-events.md) | UserLoggedInEvent | User Service |
| [payment-events.md](payment-events.md) | PaymentCreatedEvent, PaymentSucceededEvent, PaymentFailedEvent | Payment Service |
| [course-events.md](course-events.md) | CourseDraftSavedEvent, CourseAccessActivatedEvent, LessonCompletedEvent | Course Service |

## Event Structure Convention

All events share the following base fields:

| Field | Type | Description |
|---|---|---|
| eventId | string | Unique identifier for this event instance |
| occurredAt | string | ISO 8601 timestamp of when the event occurred |

Additional fields are specific to each event type and documented in the respective contract file.
