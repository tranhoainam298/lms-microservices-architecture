**2. User Service (Node.js)**
```bash
cd user-service
npm install
npm run dev
```

**3. Course Service (Node.js)**
```bash
cd course-service
npm install
npm run dev
```

**4. Exam Service (C# .NET Core)**
```bash
cd exam-service
dotnet restore
dotnet run
```

**5. Payment Service (Node.js)**
```bash
cd payment-service
npm install
npm run dev
```

### Bước 4: Khởi chạy Web Client (Port 5173)

```bash
cd web-client
npm install
npm run dev
```
Sau đó truy cập địa chỉ được hiển thị ở CLI, thường là: `http://localhost:5173`

---

## 🛠 Testing the System
Once everything is up and running, you can test the end-to-end routing through the API Gateway at `http://localhost:3000`.

**Ping Test (Routes to Exam Service):**
```bash
curl http://localhost:3000/quizzes/ping
```
*Expected Output: `{"message":"Exam Service is up and running!"}`*

**Register & Login:**
Check out the `POST /auth/register` and `POST /auth/login` endpoints to get your JWT access token. 

---

## Nhật ký và Kế hoạch Phát triển Tiếp theo (Roadmap)

- [x] Thiết lập khung xương (scaffold) cấu trúc thư mục cho toàn dự án.
- [x] Tạo đầy đủ SQL Schema cho 4 cơ sở dữ liệu.
- [x] Tích hợp Docker Compose cho toàn bộ hệ thống gồm MySQL databases và RabbitMQ.
- [x] Hiện thực hóa các dịch vụ user-service, course-service, exam-service và payment-service.
- [x] Gắn Frontend vào Backend bằng cơ sở dữ liệu thật MySQL.
- [ ] Xây dựng AI Chatbot Service.


### Step 3: Install Dependencies & Start Services

You will need to open separate terminal windows for each service.

**1. API Gateway (Node.js)**
```bash
cd api-gateway
npm install
npm run dev
```

<<<<<<< HEAD
**2. User Service (Node.js)**
=======
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

>>>>>>> origin/main
```bash
cd user-service
npm install
npm run dev
```

<<<<<<< HEAD
**3. Course Service (Node.js)**
```bash
cd course-service
npm install
npm run dev
```

**4. Exam Service (C# .NET Core)**
```bash
cd exam-service
dotnet restore
dotnet run
```

---

## 🛠 Testing the System
Once everything is up and running, you can test the end-to-end routing through the API Gateway at `http://localhost:3000`.

**Ping Test (Routes to Exam Service):**
```bash
curl http://localhost:3000/quizzes/ping
```
*Expected Output: `{"message":"Exam Service is up and running!"}`*

**Register & Login:**
Check out the `POST /auth/register` and `POST /auth/login` endpoints to get your JWT access token. 

Happy coding! 🎉
=======
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
>>>>>>> origin/main
