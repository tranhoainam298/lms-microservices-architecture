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

## Security Features

- **Rate Limiting**: `POST /auth/login` is rate-limited using `express-rate-limit`. In this local single-instance phase, the rate limiter uses in-memory storage. In a distributed multi-instance deployment phase, a distributed rate limiter using a shared store like Redis would be required to enforce the limit across all gateway instances.
- **Proxy Configuration**: Supports `TRUST_PROXY_HOPS` to safely trust reverse proxies (like Cloudflare, Nginx, or AWS ALB) in production without blindly accepting arbitrary `X-Forwarded-For` headers.
