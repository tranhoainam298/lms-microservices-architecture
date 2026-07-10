# LMS Microservices Architecture

Hệ thống LMS đa vai trò dùng API Gateway, các service độc lập và MySQL riêng cho từng domain. Các luồng User, Course Authoring và Exam cốt lõi sử dụng dữ liệu thật, JWT thật và kiểm tra quyền ở cả Gateway lẫn service đích.

## Kiến trúc

```text
React/Vite Web Client :5173
          |
          v
API Gateway :3000
  |-- User Service   :5001 --> lms_user_db
  |-- Course Service :5002 --> lms_course_db
  |-- Exam Service   :5003 --> lms_exam_db
  `-- Payment Service       --> lms_payment_db / RabbitMQ
```

Mỗi service chỉ sở hữu database của domain mình. Exam Service không đọc Course DB trực tiếp; nó gọi Course Service bằng JWT gốc để xác minh ownership hoặc quyền học viên.

## Chức năng đã triển khai

### User account

- Đăng ký công khai chỉ tạo tài khoản `student`.
- Login MySQL với bcrypt, JWT, audit và rate limiting.
- Xem/cập nhật profile và đổi mật khẩu.
- Admin liệt kê tài khoản và thay đổi trạng thái active/inactive.
- JWT được kiểm tra lại bên trong User Service.

### Instructor course authoring

- Tạo, liệt kê và chỉnh sửa draft thuộc instructor đăng nhập.
- Tạo, liệt kê, chỉnh sửa và xóa lesson trong draft thuộc instructor.
- Publish course bằng transaction; yêu cầu ít nhất một lesson.
- Legacy lesson-creation endpoint trả HTTP 410.

### Exam workflow

- Instructor tạo, liệt kê, chỉnh sửa, xóa và publish quiz cho draft course của mình.
- Quiz/questions được ghi transactionally vào Exam DB.
- Student chỉ được list/load/submit quiz khi:
  - course có status `published`;
  - student có enrollment status `active`.
- Exam Service chấm điểm phía server; client không gửi điểm có thẩm quyền.
- Student quiz response không chứa answer key.
- Kết quả lịch sử vẫn đọc được khi trạng thái enrollment thay đổi.

## Port mặc định

| Thành phần | Port |
|---|---:|
| Web Client | 5173 |
| API Gateway | 3000 |
| User Service | 5001 |
| Course Service | 5002 |
| Exam Service | 5003 |
| User MySQL host port | 3316 |
| Course MySQL host port | 3317 |
| Exam MySQL host port | 3308 |
| Payment MySQL host port | 3309 |
| RabbitMQ | 5672 |
| RabbitMQ Management | 15672 |

## Yêu cầu

- Docker Desktop
- Node.js 18 trở lên và npm
- .NET SDK 9
- PowerShell hoặc Command Prompt trên Windows

Không commit JWT secret hoặc database password. Tạo `.env` cục bộ từ các file `.env.example` và dùng cùng một `JWT_SECRET` cho Gateway, User, Course và Exam Service.

## Khởi chạy nhanh trên Windows

Double-click:

```text
start-lms.bat
```

Launcher hiện thực hiện:

1. Khởi động Docker infrastructure từ `infra/docker-compose.yml`.
2. Chạy migration User Service idempotent khi có.
3. Build và mở Exam Service khi port 5003 chưa chạy.
4. Mở User Service, Course Service, API Gateway và Web Client khi các port tương ứng chưa chạy.
5. Chờ đủ các port 5001, 5002, 5003, 3000 và 5173 rồi mới mở `http://localhost:5173`.

Launcher lấy Exam DB connection settings từ container `exam-db-mysql` đang chạy và không in credential ra màn hình.

## Khởi chạy thủ công

### 1. Infrastructure

```powershell
docker compose -f infra/docker-compose.yml up -d
```

Không dùng `docker compose down -v` nếu cần giữ dữ liệu local.

### 2. Node services

Mở terminal riêng cho từng service:

```powershell
cd user-service
npm run dev
```

```powershell
cd course-service
npm run dev
```

```powershell
cd api-gateway
npm run dev
```

### 3. Exam Service

Exam Service yêu cầu secret và connection string từ environment. Ví dụ PowerShell với placeholder:

```powershell
$env:JWT_SECRET="<same-secret-as-gateway>"
$env:ConnectionStrings__DefaultConnection="Server=127.0.0.1;Port=3308;Database=lms_exam_db;User=<user>;Password=<password>;"
dotnet run --project exam-service/ExamService.csproj
```

`Program.cs` fail closed khi thiếu `JWT_SECRET` hoặc connection string. Schema upgrade chạy bằng migration runner idempotent, không dùng `EnsureCreated` để thay thế migration.

### 4. Web Client

```powershell
cd web-client
npm run dev
```

Truy cập `http://localhost:5173`.

## API chính

Tất cả public Web Client API đi qua `http://localhost:3000`.

### Auth/User

```text
POST  /auth/register
POST  /auth/login
GET   /users/me
PATCH /users/me
PATCH /users/me/password
GET   /users/admin/users
PATCH /users/admin/users/:userId/status
```

### Course authoring

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

### Exam

```text
POST   /exams/courses/:courseId/quizzes
GET    /exams/courses/:courseId/quizzes/mine
GET    /exams/courses/:courseId/quizzes/:quizId/mine
PATCH  /exams/courses/:courseId/quizzes/:quizId
DELETE /exams/courses/:courseId/quizzes/:quizId
PATCH  /exams/courses/:courseId/quizzes/:quizId/publish

GET    /exams/courses/:courseId/quizzes
GET    /exams/quizzes/:quizId
POST   /exams/quizzes/:quizId/submit
GET    /exams/results/mine
GET    /exams/results/:resultId
```

Course Service còn có internal endpoint `GET /courses/:courseId/student-exam-access`; Web Client không gọi endpoint này trực tiếp.

## Security model

- Identity chỉ lấy từ JWT đã xác minh (`id` hoặc `sub`).
- Backend không authorize bằng body identity, query identity, React state, localStorage, `X-User-Id` hoặc `X-User-Role` trong các authoring/account/exam flow mới.
- Route IDs dùng strict positive decimal validation.
- SQL request values dùng parameterization hoặc EF Core parameterization.
- Instructor operations kiểm tra ownership và draft status.
- Student Exam access kiểm tra published course và active enrollment trước khi trả quiz hoặc grade.
- Missing/invalid token trả 401; sai role trả 403; ownership-sensitive failures dùng response không tiết lộ chủ sở hữu.

## Verification

```powershell
node --check api-gateway/src/routes/examRoutes.js
node --check course-service/src/routes/courseRoutes.js
node --check course-service/src/controllers/courseController.js
node --check course-service/src/services/courseService.js
dotnet build exam-service/ExamService.csproj

cd web-client
npm run build
```

Kiểm tra whitespace của thay đổi:

```powershell
git diff --check
git status --short
```

## Giới hạn hiện tại

- `start-lms.bat` khởi động core User/Course/Exam/Gateway/Web workflow; Payment và AI không được tự động start.
- Payment và AI screens còn có phần demo/mock, chưa thuộc core workflow được xác minh ở trên.
- Stateless JWT đã phát hành trước khi đổi mật khẩu không bị thu hồi toàn cục.
- Rate limiter dùng in-memory store; production nhiều instance cần shared store.
- Không commit tài khoản mẫu hoặc credential vào README.

Xem tài liệu chi tiết tại:

- [API Gateway](api-gateway/README.md)
- [User Service](user-service/README.md)
- [Course Service](course-service/README.md)
- [Exam Service](exam-service/README.md)
- [Web Client](web-client/README.md)
- [Documentation index](docs/README.md)
