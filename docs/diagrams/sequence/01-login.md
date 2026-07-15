# Sequence 1 — Login with Message Broker

**Public endpoint:** `POST /api/auth/login`

**Gateway/service endpoint:** `POST /auth/login`

**Event:** `UserLoggedInEvent` on `lms_events` with routing key `user.loggedin`

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Web Client
    participant Gateway as API Gateway
    participant UserSvc as User Service
    participant UserDB as User DB
    participant Broker as Message Broker

    User->>Web: Enter email, password, and selected role
    Web->>Gateway: POST /api/auth/login
    Note over Web,Gateway: Nginx removes /api; Gateway receives POST /auth/login
    Gateway->>Gateway: Rate-limit and validate request shape
    Gateway->>UserSvc: POST /auth/login
    UserSvc->>UserDB: SELECT user by normalized email
    UserDB-->>UserSvc: User credential/status record
    UserSvc->>UserSvc: Verify password hash, status, and role

    alt Invalid credentials, inactive account, or role mismatch
        UserSvc->>UserDB: INSERT login_audit failure
        UserSvc-->>Gateway: 401/403 safe error
        Gateway-->>Web: Preserve status and error body
        Web-->>User: Show authentication error
    else Authentication succeeds
        UserSvc->>UserSvc: Create signed JWT from server-side identity
        UserSvc->>UserDB: INSERT login_audit success
        UserSvc->>Broker: Publish UserLoggedInEvent<br/>routing key user.loggedin
        opt Broker publication unavailable
            Broker--xUserSvc: Publish/confirm fails
            UserSvc->>UserSvc: Log safe warning; keep login successful
        end
        UserSvc-->>Gateway: 200 accessToken + userProfile
        Gateway-->>Web: 200 authenticated response
        Web-->>User: Open role-appropriate LMS screen
    end
```

The event contains only `userId`, `role`, and `loginTime` inside the standard versioned envelope. It never includes the password, password hash, or JWT. Login remains available if the non-critical event publication is temporarily unavailable.
