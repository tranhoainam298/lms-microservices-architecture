# User Events

**Publisher:** User Service
**Channel:** Message Broker

---

## UserLoggedInEvent

Published when a user successfully logs in through the User Service.

### Payload

| Field | Type | Description |
|---|---|---|
| eventId | string | Unique event instance identifier |
| userId | string | ID of the user who logged in |
| role | string | User's role (student, instructor, admin) |
| occurredAt | string | ISO 8601 timestamp of login |

### Triggered By

- `POST /auth/login` — successful authentication

### Potential Consumers

- Audit/logging systems (future)
- Analytics (future)
