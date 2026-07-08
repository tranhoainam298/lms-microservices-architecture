# Payment Events

**Publisher:** Payment Service
**Channel:** Message Broker

---

## PaymentCreatedEvent

Published when a new payment transaction is created and sent to the Payment Gateway for processing.

### Payload

| Field | Type | Description |
|---|---|---|
| eventId | string | Unique event instance identifier |
| paymentId | string | Payment transaction ID |
| userId | string | ID of the user making the payment |
| courseId | string | ID of the course being purchased |
| amount | number | Payment amount |
| status | string | Payment status ("pending") |
| occurredAt | string | ISO 8601 timestamp of creation |

### Triggered By

- `POST /payments` — payment transaction initiated

---

## PaymentSucceededEvent

Published when the Payment Gateway confirms a successful payment. After this event, Payment Service requests Course Service to activate course access.

### Payload

| Field | Type | Description |
|---|---|---|
| eventId | string | Unique event instance identifier |
| paymentId | string | Payment transaction ID |
| userId | string | ID of the user who paid |
| courseId | string | ID of the course purchased |
| amount | number | Payment amount |
| status | string | Payment status ("succeeded") |
| occurredAt | string | ISO 8601 timestamp of confirmation |

### Triggered By

- Payment Gateway ZaloPay/Momo — successful payment callback

### Potential Consumers

- Course Service (to activate course access)

---

## PaymentFailedEvent

Published when the Payment Gateway rejects or fails to process a payment. Course access is NOT activated.

### Payload

| Field | Type | Description |
|---|---|---|
| eventId | string | Unique event instance identifier |
| paymentId | string | Payment transaction ID |
| userId | string | ID of the user whose payment failed |
| courseId | string | ID of the course that was not purchased |
| amount | number | Attempted payment amount |
| status | string | Payment status ("failed") |
| occurredAt | string | ISO 8601 timestamp of failure |

### Triggered By

- Payment Gateway ZaloPay/Momo — failed payment callback or gateway timeout
