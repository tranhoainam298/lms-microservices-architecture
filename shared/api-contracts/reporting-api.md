# Revenue Reporting API Contract

**Public entry point:** API Gateway
**Data ownership:** Payment Service / Payment DB and Course Service / Course DB

There is no Reporting Service or Reporting DB. The API Gateway only forwards the request. Payment Service reads its own transaction records, requests minimal course metadata from Course Service, and performs the aggregation.

## GET /payments/reports/revenue

Returns the current revenue summary, course breakdown, and transaction ledger.

### Authorization

- A valid administrator JWT is required.
- Missing or invalid tokens return HTTP 401.
- Student and instructor tokens return HTTP 403.

### Request

```http
GET /payments/reports/revenue
Authorization: Bearer {accessToken}
```

### Success response (200)

```json
{
  "summary": {
    "totalRevenue": 0,
    "totalTransactions": 0,
    "successfulTransactions": 0,
    "successRate": 0,
    "averageOrderValue": 0,
    "currency": "VND"
  },
  "courseBreakdown": [],
  "transactions": []
}
```

`totalTransactions` counts every recorded payment attempt. Revenue, average order value, and each course's revenue count only the canonical successful payment status (`success`); pending and failed attempts never contribute revenue.

### Internal course metadata lookup

Payment Service calls:

```http
GET /courses/internal/titles?ids=1,2,3
X-Internal-Service-Secret: {sharedSecret}
```

Course Service returns only `id`, `title`, `price`, and `status` for the requested course IDs. Calls without the valid internal secret are rejected. Payment Service never connects to Course DB, and Course Service never connects to Payment DB.

### Data flow

1. Admin Web Client sends the request through Nginx and API Gateway.
2. API Gateway forwards the original authorization header to Payment Service.
3. Payment Service verifies the administrator JWT and queries Payment DB.
4. Payment Service calls the protected Course Service metadata endpoint for referenced course IDs.
5. Course Service queries Course DB and returns minimal metadata.
6. Payment Service aggregates and returns the report through API Gateway.
