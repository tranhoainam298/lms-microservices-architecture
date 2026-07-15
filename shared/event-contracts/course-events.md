# Course events

The active Course Service contract is [CourseAccessActivatedEvent](CourseAccessActivatedEvent.md). It is emitted after Course DB commits a new or reactivated enrollment. Repeating activation for an already-active student/course pair is a successful idempotent no-op and does not emit a duplicate transition event.
