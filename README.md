# Learning Management System (LMS) - Microservices Architecture

ChÃ o má»«ng báº¡n Ä‘áº¿n vá»›i dá»± Ã¡n **Há»‡ thá»‘ng Quáº£n lÃ½ Há»c táº­p (LMS)** Ä‘Æ°á»£c thiáº¿t káº¿ dá»±a trÃªn **Kiáº¿n trÃºc Microservices**. ÄÃ¢y lÃ  má»™t khung dá»± Ã¡n (Scaffold) mÃ´ phá»ng cÃ¡c luá»“ng nghiá»‡p vá»¥ cÆ¡ báº£n cá»§a há»‡ thá»‘ng LMS thá»±c táº¿ sá»­ dá»¥ng cÃ¡c dá»‹ch vá»¥ Ä‘á»™c láº­p káº¿t ná»‘i qua API Gateway vÃ  giao tiáº¿p báº¥t Ä‘á»“ng bá»™ qua Message Broker.

---

## ðŸ“ Kiáº¿n trÃºc Há»‡ thá»‘ng (System Architecture)

Há»‡ thá»‘ng Ä‘Æ°á»£c thiáº¿t káº¿ vá»›i sá»± cÃ´ láº­p hoÃ n toÃ n giá»¯a cÃ¡c dá»‹ch vá»¥. Má»—i microservice chá»‹u trÃ¡ch nhiá»‡m cho má»™t miá»n nghiá»‡p vá»¥ (Domain) cá»¥ thá»ƒ vÃ  sá»Ÿ há»¯u cÆ¡ sá»Ÿ dá»¯ liá»‡u riÃªng (Database per Service).

### SÆ¡ Ä‘á»“ luá»“ng hoáº¡t Ä‘á»™ng (Architecture Diagram)

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

    %% Connections
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

    %% Event communication
    PaySvc -.->|Publish: PaymentSucceededEvent| RabbitMQ
    RabbitMQ -.->|Subscribe| CourseSvc
```

---

## ðŸ› ï¸ Danh sÃ¡ch Dá»‹ch vá»¥ & PhÃ¢n bá»• CÆ¡ sá»Ÿ dá»¯ liá»‡u

| Microservice | Cá»•ng (Port) | Vai trÃ² & Nghiá»‡p vá»¥ chÃ­nh | CÆ¡ sá»Ÿ dá»¯ liá»‡u (Database) | CÃ¡c báº£ng dá»¯ liá»‡u (Tables) |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | `3000` | Äiá»ƒm Ä‘áº§u vÃ o duy nháº¥t. Routing, JWT validation, rate limiting. | KhÃ´ng cÃ³ | KhÃ´ng |
| **User Service** | `3001` | Quáº£n lÃ½ Ä‘á»‹nh danh, thÃ´ng tin ngÆ°á»i dÃ¹ng, phÃ¢n quyá»n (RBAC). | `lms_user_db` | `users`, `roles`, `user_roles`, `login_audit` |
| **Course Service** | `3002` | Quáº£n lÃ½ khÃ³a há»c, bÃ i há»c, tiáº¿n trÃ¬nh há»c táº­p, AI context. | `lms_course_db` | `courses`, `lessons`, `course_access`, `learning_progress`, `ai_learning_context` |
| **Exam & Quiz Service**| `3003` | Quáº£n lÃ½ ngÃ¢n hÃ ng cÃ¢u há»i, bÃ i thi thá»­, cháº¥m Ä‘iá»ƒm vÃ  lÆ°u lá»‹ch sá»­. | `lms_exam_db` | `question_bank`, `quizzes`, `quiz_questions`, `quiz_attempts`, `submitted_answers`, `grading_results` |
| **Payment Service** | `3004` | Quáº£n lÃ½ thanh toÃ¡n khÃ³a há»c, lá»‹ch sá»­ giao dá»‹ch vÃ  tÃ­ch há»£p ZaloPay/Momo. | `lms_payment_db` | `payments`, `payment_transactions`, `payment_gateway_logs`, `revenue_records` |

---

## ðŸ“ Quy táº¯c Kiáº¿n trÃºc Dá»¯ liá»‡u (Database Isolation Rules)

1. **Database per Service Isolation**: Má»—i cÆ¡ sá»Ÿ dá»¯ liá»‡u hoÃ n toÃ n thuá»™c quyá»n sá»Ÿ há»¯u riÃªng cá»§a má»™t dá»‹ch vá»¥. Tuyá»‡t Ä‘á»‘i khÃ´ng cho phÃ©p thá»±c hiá»‡n cÃ¡c káº¿t ná»‘i liÃªn cÆ¡ sá»Ÿ dá»¯ liá»‡u (cross-database query, JOIN, VIEW SQL) trá»±c tiáº¿p tá»« dá»‹ch vá»¥ nÃ y sang cÆ¡ sá»Ÿ dá»¯ liá»‡u cá»§a dá»‹ch vá»¥ khÃ¡c.
2. **Forbidden Cross-Database Foreign Keys**: KhÃ´ng thiáº¿t láº­p rÃ ng buá»™c khÃ³a ngoáº¡i váº­t lÃ½ (Physical Foreign Key) vÆ°á»£t qua ranh giá»›i cÆ¡ sá»Ÿ dá»¯ liá»‡u. VÃ­ dá»¥: báº£ng `course_access` thuá»™c `lms_course_db` lÆ°u `user_id` chá»‰ lÃ  má»™t cá»™t dáº¡ng `BIGINT` bÃ¬nh thÆ°á»ng, khÃ´ng liÃªn káº¿t trá»±c tiáº¿p tá»›i báº£ng `users` cá»§a `lms_user_db`.
3. **Logical External References**: Giao tiáº¿p vÃ  xÃ¡c thá»±c cÃ¡c khÃ³a ngoáº¡i logic (e.g., `user_id`, `course_id`) Ä‘Æ°á»£c thá»±c hiá»‡n thÃ´ng qua API Gateway Ä‘á»“ng bá»™ hoáº·c gá»­i nháº­n tin nháº¯n báº¥t Ä‘á»“ng bá»™ qua **RabbitMQ Event Broker**.

---

## ðŸ“‚ Cáº¥u trÃºc ThÆ° má»¥c Dá»± Ã¡n (Project Structure)

Dá»± Ã¡n Ä‘Æ°á»£c phÃ¢n chia thÆ° má»¥c rÃµ rÃ ng theo Ä‘Ãºng chuáº©n Microservices Scaffold:

* [api-gateway](./api-gateway): Dá»‹ch vá»¥ Ä‘á»‹nh tuyáº¿n API (ExpressJS).
* [user-service](./user-service): Dá»‹ch vá»¥ quáº£n lÃ½ User (ExpressJS).
* [course-service](./course-service): Dá»‹ch vá»¥ quáº£n lÃ½ khÃ³a há»c (ExpressJS).
* [exam-service](./exam-service): Dá»‹ch vá»¥ bÃ i thi & cÃ¢u há»i (Skeleton).
* [payment-service](./payment-service): Dá»‹ch vá»¥ thanh toÃ¡n (Skeleton).
* [web-client](./web-client): á»¨ng dá»¥ng Frontend Web (ReactJS + Vite).
* [mobile-client](./mobile-client): á»¨ng dá»¥ng Frontend Mobile (Flutter placeholder).
* [infra](./infra): Cáº¥u hÃ¬nh cÆ¡ sá»Ÿ dá»¯ liá»‡u, broker vÃ  docker.
  * [databases](./infra/databases): Chá»©a cÃ¡c file schema SQL cá»§a cÃ¡c CSDL.
    * [user-db/schema.sql](./infra/databases/user-db/schema.sql): CSDL quáº£n lÃ½ Users.
    * [course-db/schema.sql](./infra/databases/course-db/schema.sql): CSDL quáº£n lÃ½ khÃ³a há»c.
    * [exam-db/schema.sql](./infra/databases/exam-db/schema.sql): CSDL quáº£n lÃ½ bÃ i thi.
    * [payment-db/schema.sql](./infra/databases/payment-db/schema.sql): CSDL quáº£n lÃ½ thanh toÃ¡n.
* [external-systems](./external-systems): Giáº£ láº­p cÃ¡c bÃªn thá»© ba (ZaloPay/Momo, Chatbot AI).
* [shared](./shared): API contracts vÃ  cÃ¡c event contracts dÃ¹ng chung.

---

## ðŸ”„ Luá»“ng Nghiá»‡p vá»¥ Hiá»‡n táº¡i (Implemented Flows)

Hiá»‡n táº¡i, há»‡ thá»‘ng Ä‘Ã£ giáº£ láº­p thÃ nh cÃ´ng cÃ¡c luá»“ng nghiá»‡p vá»¥ sau thÃ´ng qua káº¿t ná»‘i HTTP giá»¯a Frontend vÃ  Backend qua API Gateway:

1. **ÄÄƒng nháº­p (Login Flow)**:
   - Client gá»­i thÃ´ng tin Ä‘Äƒng nháº­p qua `POST /auth/login` tá»›i **API Gateway (Port 3000)**.
   - API Gateway chuyá»ƒn tiáº¿p yÃªu cáº§u Ä‘áº¿n **User Service (Port 3001)**.
   - User Service xÃ¡c thá»±c vÃ  tráº£ vá» má»™t mÃ£ token giáº£ láº­p (`mock-token-instructor-instructor-1` hoáº·c `mock-token-student-student-1`) kÃ¨m thÃ´ng tin Profile vÃ  Vai trÃ² (`role`).
2. **LÆ°u NhÃ¡p KhÃ³a Há»c (Course Draft Flow)**:
   - Instructor thá»±c hiá»‡n táº¡o khÃ³a há»c táº¡i mÃ n hÃ¬nh Draft trÃªn Frontend.
   - YÃªu cáº§u Ä‘Æ°á»£c gá»­i kÃ¨m tiÃªu Ä‘á» xÃ¡c thá»±c `Authorization: Bearer mock-token-instructor-instructor-1` tá»›i `POST /courses/draft` cá»§a **API Gateway**.
   - API Gateway chuyá»ƒn tiáº¿p thÃ´ng tin khÃ³a há»c nhÃ¡p cÃ¹ng token Ä‘áº¿n **Course Service (Port 3002)** Ä‘á»ƒ lÆ°u láº¡i vÃ o máº£ng dá»¯ liá»‡u táº¡m thá»i (In-memory).
3. **Giáº£ Láº­p Luá»“ng Thanh ToÃ¡n (Payment Simulation Flow)**:
   - Client cÃ³ thá»ƒ chuyá»ƒn hÆ°á»›ng Ä‘áº¿n trang thanh toÃ¡n giáº£ láº­p liÃªn káº¿t vá»›i Momo/ZaloPay.
   - Khi thanh toÃ¡n thÃ nh cÃ´ng, há»‡ thá»‘ng mÃ´ phá»ng phÃ¡t ra má»™t sá»± kiá»‡n `PaymentSucceededEvent` qua Event Broker Ä‘á»ƒ Course Service tá»± Ä‘á»™ng má»Ÿ khÃ³a quyá»n truy cáº­p khÃ³a há»c cho há»c viÃªn (`course_access`).

---

## ðŸš€ HÆ°á»›ng dáº«n Cháº¡y Thá»­ Cá»¥c bá»™ (Local Startup Guide)

Äá»ƒ khá»Ÿi cháº¡y thá»­ cÃ¡c luá»“ng hoáº¡t Ä‘á»™ng chÃ­nh, báº¡n cáº§n má»Ÿ cÃ¡c tab Terminal riÃªng biá»‡t vÃ  thá»±c hiá»‡n cÃ i Ä‘áº·t/cháº¡y cÃ¡c dá»‹ch vá»¥ sau:

### BÆ°á»›c 1: Khá»Ÿi cháº¡y API Gateway (Port 3000)
```bash
cd api-gateway
npm install
npm run dev
```

### BÆ°á»›c 2: Khá»Ÿi cháº¡y User Service (Port 3001)
```bash
cd user-service
npm install
npm run dev
```

### BÆ°á»›c 3: Khá»Ÿi cháº¡y Course Service (Port 3002)
```bash
cd course-service
npm install
npm run dev
```

### BÆ°á»›c 4: Khá»Ÿi cháº¡y Web Client (Port 5173)
```bash
cd web-client
npm install
npm run dev
```
Sau Ä‘Ã³ truy cáº­p Ä‘á»‹a chá»‰ Ä‘Æ°á»£c hiá»ƒn thá»‹ á»Ÿ CLI (thÆ°á»ng lÃ  `http://localhost:5173`) Ä‘á»ƒ tráº£i nghiá»‡m giao diá»‡n ngÆ°á»i dÃ¹ng.

---

## ðŸ“ Nháº­t kÃ½ & Káº¿ hoáº¡ch PhÃ¡t triá»ƒn Tiáº¿p theo (Roadmap)
- [x] Thiáº¿t láº­p khung xÆ°Æ¡ng (scaffold) cáº¥u trÃºc thÆ° má»¥c cho toÃ n dá»± Ã¡n.
- [x] Táº¡o Ä‘áº§y Ä‘á»§ SQL Schema cho 4 cÆ¡ sá»Ÿ dá»¯ liá»‡u trong thÆ° má»¥c `infra/databases/`.
- [x] Hiá»‡n thá»±c hÃ³a luá»“ng Login vÃ  Course Draft káº¿t ná»‘i xuyÃªn suá»‘t tá»« UI -> Gateway -> Services.
- [ ] TÃ­ch há»£p káº¿t ná»‘i cÆ¡ sá»Ÿ dá»¯ liá»‡u SQL Server thá»±c táº¿ cho cÃ¡c dá»‹ch vá»¥ thay tháº¿ cho In-memory storage.
- [ ] Thiáº¿t láº­p Docker Compose cho toÃ n bá»™ há»‡ thá»‘ng (dá»‹ch vá»¥ + cÆ¡ sá»Ÿ dá»¯ liá»‡u + RabbitMQ).
- [ ] Hiá»‡n thá»±c hÃ³a cÃ¡c dá»‹ch vá»¥ `exam-service` vÃ  `payment-service`.