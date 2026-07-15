# UserLoggedInEvent

- Exchange: `lms_events` (durable topic)
- Routing key: `user.loggedin`
- Producer: User Service
- Current consumers: runtime audit/demo subscribers; no core write depends on this event
- Delivery: persistent publish with confirm; best effort after successful login

```json
{
  "eventId": "5ea1d92a-cb06-4cb0-9164-e5b7a69da21d",
  "eventType": "UserLoggedInEvent",
  "eventVersion": 1,
  "occurredAt": "2026-07-15T08:30:00.000Z",
  "source": "user-service",
  "data": {
    "userId": 101,
    "role": "student",
    "loginTime": "2026-07-15T08:30:00.000Z"
  }
}
```

`eventId` is the deduplication key. The event must not include email, password, password hash, JWT, IP address, user agent, or credentials.
