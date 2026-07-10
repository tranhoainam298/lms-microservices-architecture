# Exam Service

Exam Service là ASP.NET Core/.NET 9 service, chạy mặc định tại `http://localhost:5003`, sở hữu `lms_exam_db` và dùng EF Core với Pomelo MySQL.

Service quản lý quiz/questions/results nhưng không truy cập Course DB trực tiếp. Course ownership và student access được xác minh qua Course Service bằng dependency-injected `HttpClient` và original Authorization header.

## Environment and run

`JWT_SECRET` và `ConnectionStrings__DefaultConnection` là bắt buộc. `appsettings.json` không chứa database credential.

PowerShell example:

```powershell
$env:JWT_SECRET="<same-secret-as-user-course-gateway>"
$env:ConnectionStrings__DefaultConnection="Server=127.0.0.1;Port=3308;Database=lms_exam_db;User=<user>;Password=<password>;"
dotnet run --project exam-service/ExamService.csproj
```

Service fail closed khi thiếu JWT secret hoặc database connection string.

## Instructor API

```text
POST   /exams/courses/:courseId/quizzes
GET    /exams/courses/:courseId/quizzes/mine
GET    /exams/courses/:courseId/quizzes/:quizId/mine
PATCH  /exams/courses/:courseId/quizzes/:quizId
DELETE /exams/courses/:courseId/quizzes/:quizId
PATCH  /exams/courses/:courseId/quizzes/:quizId/publish
```

Rules:

- Chỉ verified role `instructor`.
- Identity chỉ lấy từ JWT.
- Course phải thuộc instructor và còn draft; Exam Service gọi `GET /courses/drafts/mine` bằng JWT gốc.
- Quiz create/edit ghi quiz và question collection trong transaction.
- Server tạo question order từ 1.
- Published quiz không thể edit/delete.
- Publish yêu cầu ít nhất một valid question và tổng points lớn hơn 0.

## Student API

```text
GET  /exams/courses/:courseId/quizzes
GET  /exams/quizzes/:quizId
POST /exams/quizzes/:quizId/submit
GET  /exams/results/mine
GET  /exams/results/:resultId
```

Trước list/load/submit, Exam Service gọi:

```text
GET http://localhost:5002/courses/:courseId/student-exam-access
Authorization: <original student Authorization header>
```

Access chỉ được phép khi course published và student có active enrollment. Draft/unpublished course, missing enrollment và inactive enrollment đều trả:

```json
{
  "code": "COURSE_ACCESS_REQUIRED",
  "message": "You must be enrolled in a published course to access its exams."
}
```

Khi Course Service unavailable, Exam Service trả safe HTTP 502 `COURSE_SERVICE_UNAVAILABLE`.

Historical result routes không gọi access check để student vẫn xem được kết quả cũ sau khi enrollment thay đổi.

## Answer and grading security

Student quiz response chỉ gồm question text, options, points và sequence order. Không trả:

```text
CorrectAnswer
correctAnswer
CorrectOptionIndex
correctOptionIndex
answerKey
```

Submit body chỉ nhận question IDs và selected option indexes. Service bỏ qua hoặc không bind client-supplied `studentId`, `score`, `maximumScore`, `percentage` và `passed`.

Server thực hiện:

1. Load published quiz và questions từ Exam DB.
2. Verify course access.
3. Reject unknown/duplicate question IDs hoặc invalid option indexes.
4. Grade bằng stored answer key.
5. Tính earned score, maximum score, percentage và pass/fail.
6. Persist result.

Unique `(StudentId, QuizId)` index chặn duplicate result; repeat submit trả HTTP 409 `QUIZ_ALREADY_SUBMITTED`.

## Database

### `quizzes`

Core fields: `Id`, `CourseId`, `InstructorId`, `Title`, `Description`, `TimeLimitMinutes`, `PassingScore`, `Status`, `CreatedAt`, `UpdatedAt`.

### `questions`

Core fields: `Id`, `QuizId`, `CourseId`, `Topic`, `Content`, `Options`, `CorrectAnswer`, `Points`, `OrderIndex`, `CreatedAt`.

### `quiz_results`

Core fields: `Id`, `StudentId`, `QuizId`, `Score`, `MaximumScore`, `Percentage`, `Passed`, `SubmittedAnswers`, `SubmittedAt`.

Questions/results có FK đến quiz. Additive schema upgrades chạy bằng `Data/ExamSchemaMigrator.cs`; migration kiểm tra metadata trước khi thêm column/index/FK và bảo toàn dữ liệu cũ.

## Authentication

- JWT HS256 signature được kiểm tra constant-time.
- Expiration, user ID và lowercase role là bắt buộc.
- Missing token trả `401 UNAUTHORIZED`.
- Invalid/expired token trả `401 INVALID_TOKEN`.
- Fake `X-User-Id`/`X-User-Role` không bypass direct port 5003.

## Build

```powershell
dotnet build exam-service/ExamService.csproj
```

`start-lms.bat` hiện không start Exam Service; chạy service bằng lệnh ở phần Environment and run.
