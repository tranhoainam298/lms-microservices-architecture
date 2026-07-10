# User Service

Changing a password does not globally revoke stateless JWTs that were issued before the change. Token revocation is outside the current account-workflow scope.

The User Service owns login validation, authentication behavior, and auditing. It connects to the MySQL User DB to retrieve user information, verify roles, compare passwords using bcrypt, and record login attempts.

## Current Route

- `POST /auth/login`
- Validates required fields, credentials, and selected role.
- Rejects role mismatches and roles outside `student`, `instructor`, and `admin`.
- Audits login results (successful and failed logins) in the `login_audit` table.
- Returns a JWT token and user profile.

## Run Later

```bash
npm install
npm run dev
```

The service listens on port `3001`. Use `npm start` to run without watch mode.

The service does not access Course DB, Exam DB, or Payment DB.
