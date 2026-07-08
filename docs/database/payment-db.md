# Payment Database Design (Payment DB)

## Owner Service
**Payment Service**

## Purpose
Store payment transactions, gateway status, payment history, and revenue data.

---

## Tables

### 1. `payments`
- **Purpose**: Main ledger recording user intents to purchase courses, invoice summaries, and high-level fulfillment status.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the payment.
  - `student_id` (UUID): Reference to the student making the purchase (Note: Logical reference to User Service; no database-level FK constraint).
  - `course_id` (UUID): Reference to the course being purchased (Note: Logical reference to Course Service; no database-level FK constraint).
  - `amount` (DECIMAL(10, 2)): The price/amount for the payment.
  - `status` (VARCHAR): Current state of the payment process (e.g., `pending`, `completed`, `failed`, `refunded`).
  - `created_at` (TIMESTAMP): Time of order/payment intent initialization.
  - `updated_at` (TIMESTAMP): Time of last state change.
- **Relationships**:
  - One-to-Many with `payment_transactions` (a payment request can trigger multiple transaction attempts).
  - One-to-Many with `payment_gateway_logs` (logs raw API payloads associated with this payment).
  - One-to-Many with `revenue_records` (a completed payment maps to course revenue allocations).

### 2. `payment_transactions`
- **Purpose**: Tracks details of individual transactions, transaction states, reference numbers, and specific gateways.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the transaction attempt.
  - `payment_id` (UUID, Foreign Key referencing `payments(id)`): The parent payment request.
  - `gateway_name` (VARCHAR): Name of external gateway (e.g., `MOMO`, `ZALOPAY`).
  - `transaction_reference` (VARCHAR, Unique): External reference ID returned by the payment gateway.
  - `status` (VARCHAR): Transaction attempt status (e.g., `initiated`, `success`, `expired`, `denied`).
  - `amount` (DECIMAL(10, 2)): Amount processed in this attempt.
  - `processed_at` (TIMESTAMP, Nullable): Time when the gateway confirmed the transaction outcome.
- **Relationships**:
  - Many-to-One with `payments`.

### 3. `payment_gateway_logs`
- **Purpose**: Stores raw API requests, webhook payloads, and responses to/from external payment gateways for debugging, verification, and audit purposes.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier.
  - `payment_id` (UUID, Foreign Key referencing `payments(id)`, Nullable): Parent payment if identifiable.
  - `gateway_name` (VARCHAR): Gateway involved (e.g., `MOMO`, `ZALOPAY`).
  - `direction` (VARCHAR): Direction of payload (`inbound` for webhooks/callbacks, `outbound` for API requests).
  - `payload` (JSON/TEXT): Raw request body or response content.
  - `logged_at` (TIMESTAMP): Timestamp when the log was captured.
- **Relationships**:
  - Many-to-One with `payments`.

### 4. `revenue_records`
- **Purpose**: Records consolidated revenue postings for courses upon successful payment. Replaces a separate Reporting DB.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier.
  - `course_id` (UUID): Reference to the course (Note: Logical reference to Course Service).
  - `payment_id` (UUID, Foreign Key referencing `payments(id)`): The payment that generated this revenue.
  - `amount` (DECIMAL(10, 2)): Amount credited to the course's revenue account.
  - `recorded_at` (TIMESTAMP): Timestamp of revenue recognition.
- **Relationships**:
  - Many-to-One with `payments`.
