# User Service

The User Service owns login validation and authentication behavior. This step uses an in-memory mock user store only; SQL Server and User DB connections are not implemented yet.

## Current Route

- `POST /auth/login`
- Validates required fields, credentials, selected role, and locked status
- Rejects role mismatches and roles outside `student`, `instructor`, and `admin`
- Returns a clearly named mock access token and user profile

## Run Later

```bash
npm install
npm run dev
```

The service listens on port `3001`. Use `npm start` to run without watch mode.

The service does not access Course DB, Exam DB, or Payment DB.
