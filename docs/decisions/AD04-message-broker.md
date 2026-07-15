# AD04 - Message Broker

## Status
Accepted

## Context
Login, payment outcome, and course-access activation are useful architectural facts for asynchronous consumers, but immediate authentication, payment state, and enrollment decisions must remain authoritative in their owning services.

## Decision
Use RabbitMQ with the durable topic exchange `lms_events`. Producers publish versioned envelopes for the routing keys `user.loggedin`, `payment.succeeded`, `payment.failed`, and `course.access.activated`. Messages are persistent and omit credentials and tokens. Payment-to-Course access activation remains an internally authenticated synchronous request; its event is not a second enrollment command.

## Consequences
- Producers and consumers are decoupled and future approved capabilities can subscribe without changing the business API.
- Broker failures are logged safely; critical database state remains consistent and login does not fail solely because a non-critical consumer is offline.
- Duplicate delivery/publication is possible, so payment transitions and enrollment activation must be idempotent.
- Runtime broker tests, event schemas, routing-key compatibility, and operational monitoring are required; a running RabbitMQ container alone is not proof of event behavior.
