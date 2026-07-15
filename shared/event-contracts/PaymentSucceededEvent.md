# PaymentSucceededEvent

- Exchange: `lms_events` (durable topic)
- Routing key: `payment.succeeded`
- Producer: Payment Service
- Current consumers: asynchronous audit/demo subscribers; Course Service access is activated synchronously through its authenticated internal API
- Delivery: persistent publish with confirm after the Payment DB transition `pending` to `success`

```json
{
  "eventId": "62d14b3f-a916-40a3-a2de-d757a128a771",
  "eventType": "PaymentSucceededEvent",
  "eventVersion": 1,
  "occurredAt": "2026-07-15T08:35:00.000Z",
  "source": "payment-service",
  "data": {
    "paymentId": 501,
    "studentId": 101,
    "courseId": 208,
    "amount": 249750,
    "currency": "VND",
    "provider": "zalopay",
    "providerTransactionId": "260715_501abc"
  }
}
```

Repeated provider confirmation is idempotent and must not publish another state-transition event. Consumers deduplicate by `eventId`; they must not create enrollment. No provider keys, callback MAC, JWT, or internal secret is allowed.
