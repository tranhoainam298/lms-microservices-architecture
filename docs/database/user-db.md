# User DB

## Ownership

- **Owner:** User Service
- **MySQL database:** `lms_user_db`
- **Schema source:** `infra/mysql-init/init-user-db.sql`

Only User Service connects to this database. User identifiers referenced by other services are logical references; no other service receives a User DB connection string.

## Tables

### `users`

Stores authentication, profile, role, and account-state data.

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `id` | `INT` | `AUTO_INCREMENT PRIMARY KEY` |
| `email` | `VARCHAR(255)` | `UNIQUE NOT NULL` |
| `password_hash` | `VARCHAR(255)` | `NOT NULL`; never returned by public APIs |
| `full_name` | `VARCHAR(255)` | `NOT NULL` |
| `role` | `VARCHAR(50)` | defaults to `student`; current roles are `student`, `instructor`, and `admin` |
| `status` | `VARCHAR(50)` | defaults to `active` |
| `created_at` | `TIMESTAMP` | defaults to the current timestamp |
| `updated_at` | `TIMESTAMP` | defaults to the current timestamp and updates automatically |

The current role value is stored directly in `users.role`.

### `login_audit`

Stores a security audit record for each login outcome.

| Column | MySQL type | Constraints / behavior |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | `AUTO_INCREMENT PRIMARY KEY` |
| `user_id` | `INT` | nullable FK to `users(id)`; set to `NULL` when the referenced user is deleted |
| `login_status` | `VARCHAR(20)` | `NOT NULL` |
| `failure_reason` | `VARCHAR(50)` | nullable |
| `ip_address` | `VARCHAR(45)` | `NOT NULL` |
| `user_agent` | `VARCHAR(500)` | nullable |
| `occurred_at` | `TIMESTAMP` | `NOT NULL`, defaults to the current timestamp |

Indexes exist on `user_id`, `login_status`, and `occurred_at`.

## Runtime responsibilities

After successful credential verification, User Service records the login, issues the JWT, and publishes `UserLoggedInEvent` with routing key `user.loggedin`. The event contains safe identifiers only; it never contains a password, password hash, or JWT.
