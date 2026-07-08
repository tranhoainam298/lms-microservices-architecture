# Payment API Contract

**Owner service:** Payment Service
**Database:** Payment DB
**External system:** Payment Gateway ZaloPay/Momo

---

## POST /payments

**Entry point:** API Gateway

### Description

Creates a payment transaction for a course purchase. Payment Service integrates with the external Payment Gateway (ZaloPay/Momo) to process the payment.

**Important business rule:** Payment Service must request Course Service to activate course access **only after successful payment**. Course access is never activated before payment confirmation.

### Request

```
POST /payments
Content-Type: application/json
Authorization: Bearer {accessToken}
```

| Field | Type | Required | Description |
|---|---|---|---|
| userId | string | Yes | ID of the user making the payment |
| courseId | string | Yes | ID of the course being purchased |
| amount | number | Yes | Payment amount |
| paymentMethod | string | Yes | Payment method ("zalopay" or "momo") |

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| paymentId | string | Generated payment transaction ID |
| status | string | Payment status ("pending", "succeeded", "failed") |
| courseAccessStatus | string | Course access status ("activated" if payment succeeded, "not_activated" otherwise) |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 400 | INVALID_REQUEST | Missing or invalid payment fields |
| 402 | PAYMENT_FAILED | Payment was rejected by the payment gateway |
| 504 | GATEWAY_TIMEOUT | Payment gateway did not respond in time |

### Flow After Successful Payment

1. Payment Service receives payment confirmation from Payment Gateway ZaloPay/Momo
2. Payment Service updates payment status to "succeeded" in Payment DB
3. Payment Service publishes `PaymentSucceededEvent` to Message Broker
4. Payment Service sends synchronous request to Course Service to activate course access
5. Course Service activates enrollment/access in Course DB
6. Course Service publishes `CourseAccessActivatedEvent` to Message Broker
7. Payment Service returns final response with courseAccessStatus = "activated"

### Flow After Failed Payment

1. Payment Service receives failure from Payment Gateway ZaloPay/Momo
2. Payment Service updates payment status to "failed" in Payment DB
3. Payment Service publishes `PaymentFailedEvent` to Message Broker
4. Payment Service returns error response — course access is NOT activated

### Related Sequence Diagram

**Sequence Diagram — Payment Management: Pay for Course**
