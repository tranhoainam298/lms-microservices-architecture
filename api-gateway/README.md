# API Gateway

The API Gateway is the single backend entry point for the Web Client. It forwards requests without containing authentication or course business logic.

## Current Route

- `POST /auth/login`
- Forwards the request body to `http://localhost:3001/auth/login`
- Returns the User Service status and JSON response unchanged
- `POST /courses/draft`
- Forwards the request body and Authorization header to `http://localhost:3002/courses/draft`
- Returns the Course Service status and JSON response unchanged

## Run Later

```bash
npm install
npm run dev
```

The Gateway listens on port `3000`. Use `npm start` to run without watch mode.

Optional environment variables:

- `PORT` defaults to `3000`
- `USER_SERVICE_URL` defaults to `http://localhost:3001`
- `COURSE_SERVICE_URL` defaults to `http://localhost:3002`
- `WEB_CLIENT_ORIGIN` defaults to `http://localhost:5173`
