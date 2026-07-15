# Payment DB

## Ownership

- **Owner:** Payment Service
- **MySQL database:** `lms_payment_db`
- **Schema source:** `infra/mysql-init/init-payment-db.sql`

Only Payment Service connects to Payment DB. `student_id` and `course_id` are logical references; there are no cross-database foreign keys to User DB or Course DB.

## Table

### `transactions`

The current Payment DB uses one transaction ledger table for checkout and provider state.

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `student_id` | `INT` | `NOT NULL`; identity comes from a verified JWT |
| `course_id` | `INT` | `NOT NULL`; logical Course Service reference |
| `amount` | `DECIMAL(15,2)` | `NOT NULL`; trusted amount is derived from Course Service metadata |
| `status` | `VARCHAR(50)` | defaults to `pending`; current flow uses `pending`, `success`, and `failed` |
| `gateway` | `VARCHAR(50)` | defaults to `zalopay` |
| `gateway_transaction_id` | `VARCHAR(255)` | nullable provider transaction identifier / ZaloPay `app_trans_id` |
| `created_at` | `TIMESTAMP` | defaults to the current timestamp |
| `updated_at` | `TIMESTAMP` | defaults to the current timestamp and updates automatically |

Indexes exist on `student_id`, `course_id`, `status`, and `gateway_transaction_id`.

## Runtime responsibilities

- Checkout obtains authoritative title, publication state, and price from Course Service; it does not trust a browser-supplied amount.
- ZaloPay callback/query confirmation causes a guarded state transition in `transactions`. Only `success` transactions count as revenue; `pending` and `failed` do not.
- On the first successful transition, Payment Service publishes `PaymentSucceededEvent`, then calls the internally authenticated Course Service enrollment-activation endpoint. Course Service owns the actual Course DB write.
- A failed transition publishes `PaymentFailedEvent` and never requests enrollment activation.
- Revenue reporting is dynamically aggregated by Payment Service from `transactions`. Payment Service obtains minimal course metadata through a Course Service internal API; neither service reads the other's database.

`transactions` is the complete current Payment DB application schema. Revenue is derived from this ledger; no Reporting DB exists.
