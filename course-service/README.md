# Course Service

The Course Service owns course draft behavior. This step stores draft courses in memory only; SQL Server and Course DB connections are not implemented yet.

## Current Route

- `POST /courses/draft`
- Listens on port `3002`
- Requires `Authorization: Bearer mock-token-instructor-instructor-1`
- Validates and stores draft courses in the in-memory mock course array

## Run Later

```bash
npm install
npm run dev
```

Use `npm start` to run without watch mode. The service does not access User DB, Exam DB, or Payment DB.
