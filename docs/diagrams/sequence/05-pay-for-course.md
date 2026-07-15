# Sequence 5 — Pay for Course with Message Broker

**Checkout:** `POST /api/payments/checkout`

**Polling:** `GET /api/payments/check-status/:appTransId`

**Callback:** `POST /api/payments/callback/zalopay`

**Course APIs:** `GET /courses/internal/purchasable/:courseId`, `POST /courses/internal/enrollments/activate`

**Events:** `payment.succeeded`, `payment.failed`, `course.access.activated` on `lms_events`

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Web as Web Client
    participant Gateway as API Gateway
    participant PaymentSvc as Payment Service
    participant PaymentDB as Payment DB
    participant CourseSvc as Course Service
    participant CourseDB as Course DB
    participant Provider as Payment Gateway
    participant Broker as Message Broker

    Student->>Web: Choose a paid published course
    Web->>Gateway: POST /api/payments/checkout<br/>{courseId, paymentMethod: zalopay} + JWT
    Gateway->>PaymentSvc: POST /payments/checkout + original JWT
    PaymentSvc->>PaymentSvc: Verify student JWT; ignore client identity/amount/status
    PaymentSvc->>CourseSvc: GET /courses/internal/purchasable/:courseId<br/>X-Internal-Service-Secret
    CourseSvc->>CourseDB: SELECT published course title, price, status
    CourseDB-->>CourseSvc: Authoritative purchasable metadata
    CourseSvc-->>PaymentSvc: 200 trusted course metadata
    PaymentSvc->>PaymentDB: GET_LOCK scoped to JWT student + course
    PaymentSvc->>PaymentDB: Check existing pending/success payment
    alt Lock busy or active payment exists
        PaymentSvc-->>Gateway: 409 busy/already pending/already completed
        Gateway-->>Web: Reuse/check existing payment state
    else Checkout reserved atomically
        PaymentSvc->>PaymentDB: INSERT one pending transaction with JWT studentId<br/>and backend-derived VND amount
        PaymentDB-->>PaymentSvc: paymentId
        PaymentSvc->>PaymentDB: Store unique ZaloPay appTransId
        PaymentSvc->>PaymentDB: RELEASE_LOCK
        PaymentSvc->>Provider: HTTPS POST ZaloPay Sandbox /v2/create<br/>HMAC-SHA256 request
        Provider-->>PaymentSvc: order_url or provider rejection

        alt Explicit order rejection<br/>(return_code != 1, including 2, or no order_url)
        PaymentSvc->>PaymentDB: Conditional UPDATE pending -> failed
        PaymentSvc->>Broker: Publish PaymentFailedEvent<br/>routing key payment.failed
        PaymentSvc-->>Gateway: 502 safe provider error
        Gateway-->>Web: Checkout failed
        Note over PaymentSvc,CourseDB: Enrollment activation is never called
    else Create timeout/connection/provider transport failure
        PaymentSvc->>PaymentSvc: Keep pending because outcome is ambiguous
        PaymentSvc-->>Gateway: Safe provider-unavailable error
        Gateway-->>Web: Check status again later
        Note over PaymentSvc,Broker: Do not emit payment.failed
        Note over PaymentSvc,Provider: Signed callback/query can recover the payment
    else Order is created
        PaymentSvc-->>Gateway: 201 pending payment + appTransId + orderUrl
        Gateway-->>Web: 201 checkout response
        Web-->>Student: Open ZaloPay Sandbox order URL
        Student->>Provider: Complete or cancel sandbox payment
        Web->>Gateway: GET /api/payments/check-status/:appTransId + JWT
        Gateway->>PaymentSvc: GET /payments/check-status/:appTransId + JWT
        PaymentSvc->>PaymentDB: Load payment by appTransId and verify owner
        PaymentSvc->>Provider: HTTPS POST ZaloPay Sandbox /v2/query<br/>HMAC-SHA256 request
        Note over Provider,PaymentSvc: A reachable POST /payments/callback/zalopay<br/>with valid KEY2 MAC is an equivalent confirmation path
        Provider-->>PaymentSvc: Confirmed provider status

        alt Provider confirms successful payment
            PaymentSvc->>PaymentDB: Conditional UPDATE pending -> success
            opt First successful state transition
                PaymentSvc->>Broker: Publish PaymentSucceededEvent<br/>routing key payment.succeeded
            end
            PaymentSvc->>CourseSvc: POST /courses/internal/enrollments/activate<br/>X-Internal-Service-Secret + studentId + courseId
            CourseSvc->>CourseDB: BEGIN; lock published course and enrollment
            CourseSvc->>CourseDB: Idempotent INSERT or UPDATE active enrollment
            CourseSvc->>CourseDB: COMMIT
            opt Access newly activated
                CourseSvc->>Broker: Publish CourseAccessActivatedEvent<br/>routing key course.access.activated
            end
            CourseSvc-->>PaymentSvc: 200 active enrollment
            PaymentSvc-->>Gateway: 200 paid + access activated
            Gateway-->>Web: 200 final status
            Web-->>Student: Refresh enrolled courses and continue learning
        else Provider confirms failed payment (return_code=2)
            PaymentSvc->>PaymentDB: Conditional UPDATE pending -> failed
            PaymentSvc->>Broker: Publish PaymentFailedEvent<br/>routing key payment.failed
            PaymentSvc-->>Gateway: 200 paid=false, status=failed
            Gateway-->>Web: Payment failed
            Note over PaymentSvc,CourseDB: No activation call and no enrollment write
        else Query timeout/transport unavailable
            PaymentSvc->>PaymentSvc: Preserve pending recoverable state
            PaymentSvc-->>Gateway: Safe provider-unavailable error
            Note over PaymentSvc,Broker: Do not emit payment.failed
        else Provider reports pending
            PaymentSvc-->>Gateway: 200 paid=false, status=pending
            Gateway-->>Web: Keep polling within UI limit
        end
        end
    end
```

The synchronous, internally authenticated Course Service call is the authoritative immediate access path. RabbitMQ events are asynchronous facts and never perform a second enrollment write. MySQL `GET_LOCK` serializes checkout reservation for each student/course pair, and the transaction rejects existing `pending` or `success` attempts. Repeated callbacks or polls do not create duplicate transactions or enrollments: payment transitions are conditional, and Course Service applies a unique student/course rule plus idempotent activation. Only an explicit ZaloPay failure emits `payment.failed`; transport ambiguity remains `pending` for callback/query recovery.

The executable external provider is ZaloPay Sandbox. Live order/query verification requires configured sandbox credentials. The local `external-payment-gateway-mock` container is not used by this production-like main flow.
