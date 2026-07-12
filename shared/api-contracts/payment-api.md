# Payment API Contract

**Owner service:** Payment Service
**Database:** Payment DB
**External system:** Payment Gateway ZaloPay/Momo

---

## POST /payments/checkout

**Entry point:** API Gateway

### Description

Creates a pending ZaloPay Sandbox order. Student identity comes from the verified JWT. Payment Service retrieves the published course and trusted price from Course Service, converts the demo price to integer VND, persists Payment DB state, signs the v2 create request, and returns ZaloPay `order_url`.

**Important business rule:** Payment Service must request Course Service to activate course access **only after successful payment**. Course access is never activated before payment confirmation.

### Request

```
POST /payments/checkout
Content-Type: application/json
Authorization: Bearer {accessToken}
```

| Field | Type | Required | Description |
|---|---|---|---|
| courseId | string | Yes | ID of the course being purchased |
| paymentMethod | string | No | Must be `zalopay`; defaults to `zalopay` |

### Success Response (201 Created)

| Field | Type | Description |
|---|---|---|
| payment.id | number | Payment DB identifier |
| payment.courseId | number | Trusted course identifier |
| payment.amount | number | Trusted course price converted to integer VND |
| payment.currency | string | `VND` |
| payment.status | string | `pending` |
| payment.provider | string | Selected mock provider |
| payment.appTransId | string | ZaloPay transaction ID in `YYMMDD_suffix` format |
| payment.orderUrl | string | ZaloPay Sandbox `order_url` |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 400 | INVALID_REQUEST | Missing or invalid payment fields |
| 402 | PAYMENT_FAILED | Payment was rejected by the payment gateway |
| 504 | GATEWAY_TIMEOUT | Payment gateway did not respond in time |

## GET /payments/check-status/{appTransId}

Requires a student JWT and ownership of the stored transaction. Payment Service signs the v2 query request with Key1. Paid confirmation changes Payment DB to `success` and calls Course Service internal enrollment activation. Pending or failed provider states never activate access.

## POST /payments/callback/zalopay

Public provider callback. Payment Service validates `HMAC_SHA256(data, ZALOPAY_KEY2)`, parses embedded IDs, verifies them against the Payment DB row, marks confirmed payment successful, and activates enrollment. Polling remains authoritative for local development because a provider cannot normally reach a localhost callback.

## POST /payments/mock/complete

Returns HTTP 410. Mock completion is disabled by default and is not used by Web Client.

## GET /payments/{paymentId}

Returns the payment only to its JWT student owner. It never accepts `studentId` as authority.

### Flow After Successful Payment

1. Payment Service receives paid confirmation from ZaloPay Sandbox query or a valid callback
2. Payment Service updates payment status to "succeeded" in Payment DB
3. Payment Service sends an internally authenticated request to Course Service to activate course access
4. Payment Service does not publish the legacy enrollment event after synchronous activation, avoiding duplicate enrollment writes
5. Course Service activates enrollment/access in Course DB
6. Course Service publishes `CourseAccessActivatedEvent` to Message Broker
7. Payment Service returns the real payment and enrollment response

### Flow After Failed Payment

1. Payment Service receives failure from ZaloPay Sandbox query
2. Payment Service updates payment status to "failed" in Payment DB
3. Payment Service publishes `PaymentFailedEvent` to Message Broker
4. Payment Service returns error response — course access is NOT activated

### Related Sequence Diagram

**Sequence Diagram — Payment Management: Pay for Course**
