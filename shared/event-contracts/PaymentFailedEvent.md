# PaymentFailedEvent

- Exchange: `lms_events` (durable topic)
- Routing key: `payment.failed`
- Producer: Payment Service
- Current consumers: asynchronous audit/demo subscribers
- Delivery: persistent publish with confirm after the Payment DB transition `pending` to `failed`

```json
{
  "eventId": "abe932fc-101b-463a-b03b-a91bd6cf92f5",
  "eventType": "PaymentFailedEvent",
  "eventVersion": 1,
  "occurredAt": "2026-07-15T08:36:00.000Z",
  "source": "payment-service",
  "data": {
    "paymentId": 502,
    "studentId": 101,
    "courseId": 208,
    "amount": 249750,
    "currency": "VND",
    "provider": "zalopay",
    "providerTransactionId": "260715_502abc",
    "failureCode": "PROVIDER_REPORTED_FAILED"
  }
}
```

This event never activates course access. It is published only after the first conditional `pending -> failed` transition caused by an explicit provider outcome: ZaloPay create-order rejection (non-`1` `return_code`, including `2`, or no `order_url`) or status-query `return_code=2`. Repeated failure confirmation is an idempotent no-op.

A request timeout, connection loss, or provider transport outage is not proof of failure. Payment Service keeps that payment `pending`, publishes no `PaymentFailedEvent`, and permits recovery by a later valid signed callback or query. Consumers deduplicate delivered events by `eventId`. No provider keys, callback MAC, JWT, or internal secret is allowed.
