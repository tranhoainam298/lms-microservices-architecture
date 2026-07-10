# Course Service

Course Service sở hữu Course DB (`lms_course_db`) và chạy mặc định tại `http://localhost:5002`. Service quản lý course drafts, lessons, publishing, enrollments và authorization check cho student Exam access.

## Run

Tạo `.env` từ `.env.example`, sau đó:

```powershell
cd course-service
npm run dev
```

Biến chính:

```text
PORT=5002
DB_HOST=localhost
DB_PORT=3317
DB_USER=<course-db-user>
DB_PASSWORD=<course-db-password>
DB_NAME=lms_course_db
JWT_SECRET=<same-secret-as-gateway>
```

Không commit `.env` hoặc credential thật.

## Instructor authoring API

Các route dưới đây xác minh JWT trong Course Service và dùng verified `req.user.id`:

```text
POST   /courses/draft
GET    /courses/drafts/mine
PATCH  /courses/drafts/:courseId
PATCH  /courses/drafts/:courseId/publish
POST   /courses/drafts/:courseId/lessons
GET    /courses/drafts/:courseId/lessons
PATCH  /courses/drafts/:courseId/lessons/:lessonId
DELETE /courses/drafts/:courseId/lessons/:lessonId
```

Security rules:

- Instructor identity chỉ từ verified JWT.
- Course/lesson IDs phải là positive decimal integers.
- Lesson create/edit/delete yêu cầu course thuộc instructor và còn `draft`.
- Publishing dùng transaction, khóa owned draft và yêu cầu ít nhất một lesson.
- Ownership/status-sensitive failures không tiết lộ course của người khác.
- Legacy `POST /courses/lessons` trả HTTP 410.

## Internal student Exam authorization

```text
GET /courses/:courseId/student-exam-access
Authorization: Bearer <student JWT>
```

Endpoint này dành cho Exam Service gọi trực tiếp; không cần expose thêm qua Gateway.

Cho phép khi cùng lúc thỏa mãn:

```sql
courses.id = route courseId
courses.status = 'published'
enrollments.course_id = courses.id
enrollments.student_id = verified JWT user ID
enrollments.status = 'active'
```

Success:

```json
{
  "allowed": true,
  "courseId": 201
}
```

Course missing, draft/unpublished hoặc enrollment không active đều trả cùng response:

```json
{
  "code": "COURSE_ACCESS_REQUIRED",
  "message": "You must be enrolled in a published course to access its exams."
}
```

Service không tin body/query identity hay `X-User-Id`/`X-User-Role` cho endpoint này.

## Relevant database tables

### `courses`

Core fields: `id`, `title`, `description`, `category`, `price`, `cover_image`, `instructor_id`, `status`, `created_at`, `updated_at`.

### `lessons`

Lessons liên kết course bằng `course_id`; server tự tạo `order_index`.

### `enrollments`

```text
id
student_id
course_id
progress_percent
status
enrolled_at
```

`course_id` có FK đến `courses.id ON DELETE CASCADE`. Status hiện dùng `active` cho quyền truy cập. Schema hiện không có unique `(student_id, course_id)` constraint.

## RabbitMQ

Course Service có listener cho enrollment events. Docker infrastructure cung cấp RabbitMQ tại port 5672. Không dùng event payload làm thay thế cho JWT authorization ở HTTP endpoints.

## Checks

```powershell
node --check src/routes/courseRoutes.js
node --check src/controllers/courseController.js
node --check src/services/courseService.js
```

Lưu ý: một số legacy lesson-delivery/enrolled-course handlers cũ còn dùng custom identity headers. Internal Exam access endpoint mới không dùng cơ chế đó; không sao chép legacy pattern vào route mới.
