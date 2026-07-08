# Reporting API Contract

**Entry point:** API Gateway
**Data source:** Payment Service + Payment DB, Course Service + Course DB

> **Note:** There is no separate Reporting Service or Reporting DB. Revenue reporting aggregates data from existing services (Payment Service and Course Service) through the API Gateway.

---

## GET /reports/revenue

### Description

Retrieves a revenue report for a specified date range. The API Gateway coordinates data retrieval from Payment Service (transaction data from Payment DB) and Course Service (course metadata from Course DB) to assemble the report.

### Request

```
GET /reports/revenue?fromDate={fromDate}&toDate={toDate}&courseId={courseId}
Authorization: Bearer {accessToken}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| fromDate | string (query) | Yes | Start date for the report period (ISO 8601) |
| toDate | string (query) | Yes | End date for the report period (ISO 8601) |
| courseId | string (query) | No | Filter by specific course ID (optional) |

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| totalRevenue | number | Total revenue in the specified period |
| transactions | array | List of payment transactions (paymentId, userId, courseId, amount, status, paidAt) |
| courseSummary | array | Per-course revenue summary (courseId, courseTitle, totalEnrollments, totalRevenue) |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 403 | FORBIDDEN | User does not have admin or instructor role |
| 400 | INVALID_DATE_RANGE | fromDate is after toDate or dates are invalid |

### Related Sequence Diagram

**Sequence Diagram — Reporting Management: View Revenue Report**

### Data Flow

1. Client sends revenue report request to API Gateway
2. API Gateway forwards request to Payment Service
3. Payment Service queries Payment DB for transactions in the date range
4. API Gateway forwards course ID list to Course Service
5. Course Service queries Course DB for course metadata
6. API Gateway aggregates the data and returns the combined report to Client
