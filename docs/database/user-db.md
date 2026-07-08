# User Database Design (User DB)

## Owner Service
**User Service**

## Purpose
Store user accounts, profiles, roles, permissions, and login audit data.

---

## Tables

### 1. `users`
- **Purpose**: Stores authentication credentials, basic account info, and profile details for all users (students, instructors, admins).
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the user.
  - `username` (VARCHAR, Unique): Login name.
  - `email` (VARCHAR, Unique): Contact and login email address.
  - `password_hash` (VARCHAR): Securely hashed password.
  - `first_name` (VARCHAR): User's first name.
  - `last_name` (VARCHAR): User's last name.
  - `status` (VARCHAR): Account status (e.g., `active`, `suspended`, `pending_verification`).
  - `created_at` (TIMESTAMP): Time of account creation.
  - `updated_at` (TIMESTAMP): Time of last profile update.
- **Relationships**:
  - One-to-Many with `user_roles` (a user can have multiple roles).
  - One-to-Many with `login_audit` (a user can have multiple login audit logs).

### 2. `roles`
- **Purpose**: Defines system roles (e.g., `admin`, `instructor`, `student`) and associated permissions.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the role.
  - `name` (VARCHAR, Unique): Name of the role (e.g., `ROLE_STUDENT`).
  - `description` (TEXT): Detailed description of what this role is allowed to do.
  - `created_at` (TIMESTAMP): Creation time.
- **Relationships**:
  - One-to-Many with `user_roles` (a role can be assigned to multiple users).

### 3. `user_roles`
- **Purpose**: Junction table linking users to their assigned roles (supporting a many-to-many relationship).
- **Main Fields**:
  - `user_id` (UUID, Foreign Key referencing `users(id)`): The user.
  - `role_id` (UUID, Foreign Key referencing `roles(id)`): The role.
  - *Composite Primary Key*: `(user_id, role_id)`.
  - `assigned_at` (TIMESTAMP): When the role was assigned.
- **Relationships**:
  - Many-to-One with `users`.
  - Many-to-One with `roles`.

### 4. `login_audit`
- **Purpose**: Stores audit trail records of login attempts for security monitoring and troubleshooting.
- **Main Fields**:
  - `id` (UUID, Primary Key): Unique identifier for the audit record.
  - `user_id` (UUID, Foreign Key referencing `users(id)`, Nullable): The user attempting to log in. (Nullable in case of invalid/non-existent username attempts).
  - `login_time` (TIMESTAMP): Time of the attempt.
  - `ip_address` (VARCHAR): Client IP address.
  - `status` (VARCHAR): Status of the login (e.g., `success`, `failed`).
  - `failure_reason` (VARCHAR, Nullable): Why the login failed (e.g., `invalid_password`, `user_not_found`).
- **Relationships**:
  - Many-to-One with `users`.
