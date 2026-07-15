# Sequence 6 — View Revenue Report

**Public endpoint:** `GET /api/payments/reports/revenue`

**Gateway/service endpoint:** `GET /payments/reports/revenue`

**Metadata dependency:** `GET /courses/internal/titles?ids=...`

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Web as Web Client
    participant Gateway as API Gateway
    participant PaymentSvc as Payment Service
    participant PaymentDB as Payment DB
    participant CourseSvc as Course Service
    participant CourseDB as Course DB

    Admin->>Web: Open Revenue Report
    Web->>Gateway: GET /api/payments/reports/revenue + admin JWT
    Gateway->>PaymentSvc: GET /payments/reports/revenue + original JWT
    PaymentSvc->>PaymentSvc: Verify JWT signature, expiry, and admin role

    alt Missing/invalid JWT or non-admin role
        PaymentSvc-->>Gateway: 401 or 403
        Gateway-->>Web: Preserve authorization error
        Web-->>Admin: Show access/error state
    else Authorized admin
        PaymentSvc->>PaymentDB: SELECT payment ledger ordered by created_at
        PaymentDB-->>PaymentSvc: Pending, failed, and successful transactions
        PaymentSvc->>CourseSvc: GET /courses/internal/titles?ids=...<br/>X-Internal-Service-Secret
        CourseSvc->>CourseDB: SELECT minimal id, title, price, status metadata
        CourseDB-->>CourseSvc: Course metadata map
        CourseSvc-->>PaymentSvc: 200 courses map
        PaymentSvc->>PaymentSvc: Count all transactions; calculate revenue,<br/>successful count/rate/AOV from status=success only;<br/>build course breakdown and ledger
        PaymentSvc-->>Gateway: 200 summary + courseBreakdown + transactions
        Gateway-->>Web: 200 report payload
        Web-->>Admin: Render summary cards, breakdown, and ledger
    end
```

Payment Service is the report aggregation owner because revenue facts are in Payment DB. Course Service supplies only narrow metadata from Course DB. Neither service connects to the other's database. `totalTransactions` means all payment attempts; `successfulTransactions`, `totalRevenue`, and `averageOrderValue` use only the canonical `success` state.
