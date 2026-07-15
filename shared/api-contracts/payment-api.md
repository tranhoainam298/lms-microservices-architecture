# Payment API Contract

**Owner:** Payment Service

**Database:** Payment DB (`transactions`)

**External provider:** ZaloPay Sandbox v2

**Public base:** `/api/payments`

The executable provider is ZaloPay Sandbox. Momo is an architectural alternative, not a claimed live adapter. Payment Service never connects to Course DB; trusted course data and access activation use protected Course Service HTTP APIs.

## Student checkout

### `POST /api/payments/checkout`

Requires a valid student JWT.

```json
{
  "courseId": 1,
  "paymentMethod": "zalopay"
}
```

`paymentMethod` is optional and defaults to `zalopay`; any other value returns `400 INVALID_PAYMENT_METHOD`. Payment Service reads no authoritative `studentId`, `amount`, `status`, `paid`, or enrollment state from the body. It:

1. derives `studentId` from the JWT;
2. calls `GET /courses/internal/purchasable/:courseId` for the published course title and price;
3. converts the trusted course price using the configured VND rate;
4. acquires a MySQL `GET_LOCK` scoped to the JWT student/course pair, checks for an existing `pending` or `success` transaction, and inserts one `pending` Payment DB transaction with a unique `appTransId`;
5. signs a form request with `ZALOPAY_KEY1` and calls the sandbox `/v2/create` endpoint.

Success: `201`:

```json
{
  "payment": {
    "id": 100,
    "courseId": 1,
    "amount": 299000,
    "currency": "VND",
    "status": "pending",
    "provider": "zalopay",
    "appTransId": "<YYMMDD_unique-suffix>",
    "orderUrl": "<sandbox order URL>"
  }
}
```

Main errors include `400 INVALID_COURSE_ID`, `401 UNAUTHORIZED`/`INVALID_TOKEN`, `403 FORBIDDEN`, `404 COURSE_NOT_AVAILABLE`, `409 PAYMENT_CHECKOUT_BUSY`, `409 PAYMENT_ALREADY_PENDING`, `409 PAYMENT_ALREADY_COMPLETED`, `502 COURSE_SERVICE_UNAVAILABLE`, provider-safe 502 errors, and configuration errors `503 ZALOPAY_NOT_CONFIGURED`, `ZALOPAY_ENV_INVALID`, `ZALOPAY_ENDPOINT_INVALID`, or `COURSE_PRICE_CONVERSION_INVALID`.

### Atomic checkout reservation

Checkout reservation is serialized per `studentId`/`courseId` with MySQL `GET_LOCK`. The reservation transaction checks for an existing `pending` or `success` payment before inserting. This prevents two concurrent requests from creating duplicate active payment attempts even though the current `transactions` schema has no conditional unique index. The named lock is released in `finally`; failure to acquire it within five seconds returns `409 PAYMENT_CHECKOUT_BUSY`.

An explicit ZaloPay create-order rejection (a response whose `return_code` is not `1`, including `return_code=2`, or which has no `order_url`) conditionally changes the new row from `pending` to `failed` and emits `PaymentFailedEvent` once. A request timeout, connection loss, or other transport-level unavailability is ambiguous because ZaloPay may have accepted the signed order before its response was lost. In that case the row deliberately remains `pending`, no failure event is published, and a later valid signed callback or status query can recover it.

Only `https://sb-openapi.zalopay.vn` create/query endpoints are accepted. Real credential values are environment-only and never returned.

## Student payment history and ownership

| Method and public path | Behavior |
|---|---|
| `GET /api/payments/mine` | Returns `{ items, total }` for all Payment DB transactions owned by the JWT student. |
| `GET /api/payments/:paymentId` | Returns `200 { payment }` only to its JWT owner; otherwise `403 FORBIDDEN` or `404 PAYMENT_NOT_FOUND`. |

Normalized payment fields are `id`, `studentId`, `courseId`, `amount`, `currency`, `status`, `provider`, `appTransId`, and `createdAt`. The returned `studentId` is stored server data, not a request authority.

## Provider status polling

### `GET /api/payments/check-status/:appTransId`

Requires a student JWT and ownership of the stored ZaloPay transaction.

- `pending`: Payment Service signs `/v2/query` with Key1.
- provider `return_code=1`: verify any returned amount, conditionally transition `pending -> success`, publish `PaymentSucceededEvent` once, and synchronously activate Course Service access.
- provider `return_code=2`: explicitly rejected/failed; conditionally transition `pending -> failed`, publish `PaymentFailedEvent` once, and never call enrollment activation.
- other provider state: return `paid: false` with the current pending payment.
- already `success`: retry the idempotent Course Service activation without republishing the payment event.

A query transport failure is not treated as provider-declared failure: Payment Service returns a safe upstream error while preserving `pending`, and it emits no `payment.failed` fact.

Successful response:

```json
{
  "success": true,
  "paid": true,
  "payment": { "status": "success" },
  "enrollment": { "id": 10, "studentId": 1, "courseId": 1, "status": "active" }
}
```

If ZaloPay has confirmed payment but Course Service activation fails, Payment DB remains `success` and the API returns `502 PAYMENT_PAID_ENROLLMENT_PENDING`; polling can safely retry.

## ZaloPay callback

### `POST /api/payments/callback/zalopay`

This provider callback does not use a student JWT. It requires `{ data, mac }`, verifies `HMAC_SHA256(data, ZALOPAY_KEY2)` using timing-safe comparison, parses embedded identifiers, and checks app ID, payment, student, course, provider transaction ID, and amount against Payment DB before finalization.

Provider acknowledgements are always HTTP 200:

- `{ "return_code": 1, "return_message": "Success" }` after valid idempotent finalization;
- `{ "return_code": -1, "return_message": "MAC invalid" }` for invalid MAC;
- `{ "return_code": 0, "return_message": "Server error" }` for identity/state/internal errors.

Polling is the usable localhost fallback because an external provider cannot normally reach a localhost callback URL.

## Payment and access events

After the first successful Payment DB transition, Payment Service publishes `PaymentSucceededEvent` to `lms_events` with routing key `payment.succeeded`, then calls `POST /courses/internal/enrollments/activate`. Course Service performs the authoritative idempotent enrollment transaction and publishes `CourseAccessActivatedEvent` with routing key `course.access.activated` only for newly activated access.

After the first explicit provider-declared failed Payment DB transition, Payment Service publishes `PaymentFailedEvent` with routing key `payment.failed` and performs no enrollment call. Ambiguous provider transport failures do not change the stored state and do not publish this event.

Event data contains payment/course/student identifiers and safe transaction metadata; it excludes JWTs, HMAC keys, provider credentials, and database credentials. Event publication never performs a second enrollment write.

## Deprecated endpoints

- `POST /api/payments/mock/complete` returns `410 ENDPOINT_DEPRECATED` and is not used by Web Client.
- `POST /api/payments/webhook/zalopay` returns `410 ENDPOINT_DEPRECATED`; use `/payments/callback/zalopay`.

## Revenue reporting

`GET /api/payments/reports/revenue` is documented in [reporting-api.md](reporting-api.md).
