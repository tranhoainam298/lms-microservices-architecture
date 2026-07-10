# Learning Management System (LMS) - Microservices Architecture

Chào mừng bạn đến với dự án **Hệ thống Quản lý Học tập (LMS)** được thiết kế dựa trên **Kiến trúc Microservices**. Đây là một khung dự án (Scaffold) mô phỏng các luồng nghiệp vụ cơ bản của hệ thống LMS thực tế, sử dụng các dịch vụ độc lập kết nối qua API Gateway và giao tiếp bất đồng bộ qua Message Broker.

---

## Kiến trúc Hệ thống (System Architecture)

Hệ thống được thiết kế với sự cô lập hoàn toàn giữa các dịch vụ. Mỗi microservice chịu trách nhiệm cho một miền nghiệp vụ (Domain) cụ thể và sở hữu cơ sở dữ liệu riêng (Database per Service).

### Sơ đồ luồng hoạt động (Architecture Diagram)

```mermaid
graph TD
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef gateway fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;
    classDef service fill:#efebe9,stroke:#3e2723,stroke-width:2px;
    classDef db fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;
    classDef external fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef broker fill:#eceff1,stroke:#37474f,stroke-width:2px,stroke-dasharray: 5 5;

    Web["Web Client (React + Vite)"]:::client
    Mobile["Mobile Client (Flutter)"]:::client

    GW["API Gateway (Port 3000)"]:::gateway

    UserSvc["User Service (Port 3001)"]:::service
    CourseSvc["Course Service (Port 3002)"]:::service
    ExamSvc["Exam & Quiz Service (Port 3003)"]:::service
    PaySvc["Payment Service (Port 3004)"]:::service

    UserDB[("User DB (SQL Server)")]:::db
    CourseDB[("Course DB (SQL Server)")]:::db
    ExamDB[("Exam DB (SQL Server)")]:::db
    PayDB[("Payment DB (SQL Server)")]:::db

    ZaloMomo["ZaloPay / Momo SDK"]:::external
    AIChatbot["AI Chatbot Engine"]:::external
    RabbitMQ{"RabbitMQ Message Broker"}:::broker

    Web -->|HTTP / REST| GW
    Mobile -->|HTTP / REST| GW

    GW -->|/auth/*| UserSvc
    GW -->|/courses/*| CourseSvc
    GW -->|/exams/*| ExamSvc
    GW -->|/payments/*| PaySvc

    UserSvc -->|Private Connection| UserDB
    CourseSvc -->|Private Connection| CourseDB
    ExamSvc -->|Private Connection| ExamDB
    PaySvc -->|Private Connection| PayDB

    PaySvc <-->|API Calls| ZaloMomo
    CourseSvc <-->|API Calls| AIChatbot

    PaySvc -.->|Publish: PaymentSucceededEvent| RabbitMQ
    RabbitMQ -.->|Subscribe| CourseSvc
```

---

## Danh sách Dịch vụ và Phân bổ Cơ sở dữ liệu

| Microservice | Cổng (Port) | Vai trò và nghiệp vụ chính | Cơ sở dữ liệu (Database) | Các bảng dữ liệu (Tables) |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | `3000` | Điểm đầu vào duy nhất. Routing, JWT validation, rate limiting. | Không có | Không |
| **User Service** | `3001` | Quản lý định danh, thông tin người dùng, phân quyền (RBAC). | `lms_user_db` | `users`, `roles`, `user_roles`, `login_audit` |
| **Course Service** | `3002` | Quản lý khóa học, bài học, tiến trình học tập, AI context. | `lms_course_db` | `courses`, `lessons`, `course_access`, `learning_progress`, `ai_learning_context` |
| **Exam & Quiz Service** | `3003` | Quản lý ngân hàng câu hỏi, bài thi thử, chấm điểm và lưu lịch sử. | `lms_exam_db` | `question_bank`, `quizzes`, `quiz_questions`, `quiz_attempts`, `submitted_answers`, `grading_results` |
| **Payment Service** | `3004` | Quản lý thanh toán khóa học, lịch sử giao dịch và tích hợp ZaloPay/Momo. | `lms_payment_db` | `payments`, `payment_transactions`, `payment_gateway_logs`, `revenue_records` |

---

## Quy tắc Kiến trúc Dữ liệu (Database Isolation Rules)

1. **Database per Service Isolation**: Mỗi cơ sở dữ liệu hoàn toàn thuộc quyền sở hữu riêng của một dịch vụ. Tuyệt đối không cho phép thực hiện các kết nối liên cơ sở dữ liệu như cross-database query, JOIN hoặc VIEW SQL trực tiếp từ dịch vụ này sang cơ sở dữ liệu của dịch vụ khác.

2. **Forbidden Cross-Database Foreign Keys**: Không thiết lập ràng buộc khóa ngoại vật lý (Physical Foreign Key) vượt qua ranh giới cơ sở dữ liệu. Ví dụ: bảng `course_access` thuộc `lms_course_db` lưu `user_id` chỉ là một cột dạng `BIGINT` bình thường, không liên kết trực tiếp tới bảng `users` của `lms_user_db`.

3. **Logical External References**: Giao tiếp và xác thực các khóa ngoại logic như `user_id`, `course_id` được thực hiện thông qua API Gateway đồng bộ hoặc gửi nhận tin nhắn bất đồng bộ qua **RabbitMQ Event Broker**.

---

## Cấu trúc Thư mục Dự án (Project Structure)

Dự án được phân chia thư mục rõ ràng theo đúng chuẩn Microservices Scaffold:

- [api-gateway](./api-gateway): Dịch vụ định tuyến API (ExpressJS).
- [user-service](./user-service): Dịch vụ quản lý User (ExpressJS).
- [course-service](./course-service): Dịch vụ quản lý khóa học (ExpressJS).
- [exam-service](./exam-service): Dịch vụ bài thi và câu hỏi (Skeleton).
- [payment-service](./payment-service): Dịch vụ thanh toán (Skeleton).
- [web-client](./web-client): Ứng dụng Frontend Web (ReactJS + Vite).
- [mobile-client](./mobile-client): Ứng dụng Frontend Mobile (Flutter placeholder).
- [infra](./infra): Cấu hình cơ sở dữ liệu, broker và docker.
  - [databases](./infra/databases): Chứa các file schema SQL của các cơ sở dữ liệu.
    - [user-db/schema.sql](./infra/databases/user-db/schema.sql): Cơ sở dữ liệu quản lý Users.
    - [course-db/schema.sql](./infra/databases/course-db/schema.sql): Cơ sở dữ liệu quản lý khóa học.
    - [exam-db/schema.sql](./infra/databases/exam-db/schema.sql): Cơ sở dữ liệu quản lý bài thi.
    - [payment-db/schema.sql](./infra/databases/payment-db/schema.sql): Cơ sở dữ liệu quản lý thanh toán.
- [external-systems](./external-systems): Giả lập các bên thứ ba như ZaloPay/Momo và Chatbot AI.
- [shared](./shared): API contracts và event contracts dùng chung.

---

## Luồng Nghiệp vụ Hiện tại (Implemented Flows)

Hiện tại, hệ thống đã giả lập thành công các luồng nghiệp vụ sau thông qua kết nối HTTP giữa Frontend và Backend qua API Gateway.

### 1. Đăng nhập (Login Flow)

- Client gửi thông tin đăng nhập qua `POST /auth/login` tới **API Gateway (Port 3000)**.
- API Gateway chuyển tiếp yêu cầu đến **User Service (Port 3001)**.
- User Service xác thực và trả về token giả lập như `mock-token-instructor-instructor-1` hoặc `mock-token-student-student-1`, kèm thông tin profile và vai trò (`role`).

### 2. Lưu Nháp Khóa Học (Course Draft Flow)

- Instructor thực hiện tạo khóa học tại màn hình Draft trên Frontend.
- Yêu cầu được gửi kèm tiêu đề xác thực `Authorization: Bearer mock-token-instructor-instructor-1` tới `POST /courses/draft` của **API Gateway**.
- API Gateway chuyển tiếp thông tin khóa học nháp cùng token đến **Course Service (Port 3002)** để lưu lại vào mảng dữ liệu tạm thời (In-memory).

### 3. Giả Lập Luồng Thanh Toán (Payment Simulation Flow)

- Client có thể chuyển hướng đến trang thanh toán giả lập liên kết với Momo/ZaloPay.
- Khi thanh toán thành công, hệ thống mô phỏng phát ra sự kiện `PaymentSucceededEvent` qua Event Broker để Course Service tự động mở khóa quyền truy cập khóa học cho học viên (`course_access`).

---

## Hướng dẫn Chạy Thử Cục bộ (Local Startup Guide)

Để khởi chạy thử các luồng hoạt động chính, cần mở các tab Terminal riêng biệt và chạy các dịch vụ sau.

### Bước 1: Khởi chạy API Gateway (Port 3000)

```bash
cd api-gateway
npm install
npm run dev
```

### Bước 2: Khởi chạy User Service (Port 3001)

```bash
cd user-service
npm install
npm run dev
```

### Bước 3: Khởi chạy Course Service (Port 3002)

```bash
cd course-service
npm install
npm run dev
```

### Bước 4: Khởi chạy Web Client (Port 5173)

```bash
cd web-client
npm install
npm run dev
```

Sau đó truy cập địa chỉ được hiển thị ở CLI, thường là:

```bash
http://localhost:5173
```

---

## Nhật ký và Kế hoạch Phát triển Tiếp theo (Roadmap)

- [x] Thiết lập khung xương (scaffold) cấu trúc thư mục cho toàn dự án.
- [x] Tạo đầy đủ SQL Schema cho 4 cơ sở dữ liệu trong thư mục `infra/databases/`.
- [x] Hiện thực hóa luồng Login và Course Draft kết nối xuyên suốt từ UI -> Gateway -> Services.
- [ ] Tích hợp kết nối cơ sở dữ liệu SQL Server thực tế cho các dịch vụ thay thế cho In-memory storage.
- [ ] Thiết lập Docker Compose cho toàn bộ hệ thống gồm dịch vụ, cơ sở dữ liệu và RabbitMQ.
- [ ] Hiện thực hóa các dịch vụ `exam-service` và `payment-service`.
