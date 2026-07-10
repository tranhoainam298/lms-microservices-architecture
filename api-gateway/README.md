# API Gateway

API Gateway là entry point duy nhất cho Web Client, mặc định tại `http://localhost:3000`. Gateway xác minh JWT, kiểm tra role/route ID và proxy request; nó không truy cập MySQL, không hash password, không grade quiz và không kiểm tra course ownership.

## Run

```powershell
cd api-gateway
npm run dev
```

Production-style local run:

```powershell
npm start
```

## Environment

Tạo `.env` từ `.env.example`:

```text
PORT=3000
USER_SERVICE_URL=http://localhost:5001
COURSE_SERVICE_URL=http://localhost:5002
EXAM_SERVICE_URL=http://localhost:5003
PAYMENT_SERVICE_URL=http://localhost:5004
JWT_SECRET=<shared-secret>
WEB_CLIENT_ORIGIN=http://localhost:5173
```

`JWT_SECRET` là bắt buộc; Gateway dừng startup nếu thiếu. Không dùng fallback secret.

## Route groups

### Authentication

```text
POST /auth/register
POST /auth/login
```

Login và registration có rate limiter riêng.

### Users

```text
GET   /users/me
PATCH /users/me
PATCH /users/me/password
GET   /users/admin/users
PATCH /users/admin/users/:userId/status
```

Password change có limiter riêng. Admin routes yêu cầu verified role `admin`.

### Courses and lessons

```text
GET    /courses
GET    /courses/enrolled
POST   /courses/draft
GET    /courses/drafts/mine
PATCH  /courses/drafts/:courseId
PATCH  /courses/drafts/:courseId/publish
POST   /courses/drafts/:courseId/lessons
GET    /courses/drafts/:courseId/lessons
PATCH  /courses/drafts/:courseId/lessons/:lessonId
DELETE /courses/drafts/:courseId/lessons/:lessonId
```

`POST /courses/lessons` là legacy endpoint và trả HTTP 410.

### Exams

Instructor:

```text
POST   /exams/courses/:courseId/quizzes
GET    /exams/courses/:courseId/quizzes/mine
GET    /exams/courses/:courseId/quizzes/:quizId/mine
PATCH  /exams/courses/:courseId/quizzes/:quizId
DELETE /exams/courses/:courseId/quizzes/:quizId
PATCH  /exams/courses/:courseId/quizzes/:quizId/publish
```

Student:

```text
GET  /exams/courses/:courseId/quizzes
GET  /exams/quizzes/:quizId
POST /exams/quizzes/:quizId/submit
GET  /exams/results/mine
GET  /exams/results/:resultId
```

Legacy `/quizzes` và `/questions` trả HTTP 410 để tránh bypass API mới.

## Proxy behavior

- Forward original `Authorization` header.
- Forward JSON body và approved query parameters.
- Preserve downstream status và JSON response.
- Không forward `X-User-Id` hoặc `X-User-Role` cho Exam authoring/student flow.
- Service unavailable trả safe 502 response, không lộ internal URL hay stack trace.

## Security

- JWT signature và expiration được xác minh bằng `process.env.JWT_SECRET`.
- User ID được normalize từ verified `id` hoặc `sub`.
- Role được normalize lowercase.
- Course/quiz/result IDs dùng strict decimal-digit validation và safe integer check.
- Frontend role checks chỉ phục vụ UX; Gateway và downstream service vẫn tự authorize.
- `TRUST_PROXY_HOPS` phải được cấu hình theo reverse-proxy topology; không bật trust-all tùy tiện.

Rate limit store hiện là in-memory cho local single-instance. Production nhiều instance cần shared storage.

## Checks

```powershell
node --check src/server.js
node --check src/routes/examRoutes.js
node --check src/proxy/examServiceProxy.js
```
