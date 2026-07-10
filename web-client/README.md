# LMS Web Client

React 18 + Vite client cho LMS microservices platform. Web Client gọi API Gateway tại `http://localhost:3000`; nó không truy cập service database trực tiếp và không được dùng làm authorization boundary.

## Run and build

```powershell
cd web-client
npm run dev
```

Default URL: `http://localhost:5173`.

Production build check:

```powershell
npm run build
```

## Real backend workflows

### Account

- Login bằng User Service/MySQL và nhận JWT thật.
- Public student registration.
- Profile load/update.
- Password change.
- Admin user listing và active/inactive controls.

### Instructor authoring

`InstructorCourseDraft.jsx` hỗ trợ:

- Create/list/edit course drafts.
- Create/list/edit/delete lessons.
- Publish course.
- Create/list/edit/delete/publish quizzes.
- Dynamic single-choice questions với 2–6 options, correct-option selector và points.

Mọi mutation gọi backend thật và reload authoritative data sau success. UI không dùng mock persistence cho course/lesson/quiz authoring.

### Student quiz

`QuizPage.jsx`:

1. List published quizzes cho course đã chọn.
2. Load questions từ Exam Service.
3. Giữ selected options trong local component state.
4. Submit question IDs + selected option indexes.
5. Hiển thị score/percentage/pass-fail do server trả về.

Frontend không chứa answer key và không tự tính authoritative score. Exam Service chỉ trả quiz khi course published và student có active enrollment.

## Authentication state

`App.jsx` giữ `accessToken`, `userProfile` và role trong React state cho session hiện tại. Role-based navigation chỉ là UX; Gateway và service đích vẫn xác minh JWT và role độc lập.

Frontend không gửi `X-User-Id` hoặc `X-User-Role` cho Exam flow, không gửi `studentId`/score/pass-fail trong quiz submission và không dùng localStorage identity làm backend authorization.

## Main files

```text
src/App.jsx
src/components/AppShell.jsx
src/components/Sidebar.jsx
src/pages/LoginPage.jsx
src/pages/ProfilePage.jsx
src/pages/AdminUserManagement.jsx
src/pages/InstructorCourseDraft.jsx
src/pages/QuizPage.jsx
src/styles/global.css
```

## Required local services

| Service | URL |
|---|---|
| API Gateway | `http://localhost:3000` |
| User Service | `http://localhost:5001` |
| Course Service | `http://localhost:5002` |
| Exam Service | `http://localhost:5003` |

Use `start-lms.bat` từ repository root để start Docker + User/Course/Exam/Gateway/Web Client.

## Current limitations

- Payment và AI areas còn có demo/mock behavior ngoài core account/course/exam workflows.
- Auth session hiện nằm trong React memory; reload có thể yêu cầu login lại.
- Frontend visibility/disabled controls không phải security control.
- Browser runtime verification phụ thuộc browser automation availability; `npm run build` chỉ xác nhận compile/bundle.
