-- =============================================
-- LMS Course Database - Schema & Seed Data
-- =============================================

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(255),
  price DECIMAL(10, 2) DEFAULT 0.0,
  cover_image VARCHAR(255),
  instructor_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  video_url VARCHAR(255),
  document_url VARCHAR(255),
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  progress_percent DECIMAL(5, 2) DEFAULT 0.0,
  status VARCHAR(50) DEFAULT 'active',
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Seed Data: Courses (instructor_id=2 is Tran Thi Bich, instructor_id=6 is Vo Thi Phuong)
-- =============================================
INSERT INTO courses (id, title, description, category, price, instructor_id, status) VALUES
  (1, 'Nhập môn Lập trình Python', 'Khóa học cơ bản về Python cho người mới bắt đầu. Bao gồm cú pháp, biến, vòng lặp, hàm, xử lý file và lập trình hướng đối tượng cơ bản.', 'Lập trình', 299000, 2, 'published'),
  (2, 'Phát triển Web với React & Node.js', 'Xây dựng ứng dụng web full-stack hiện đại với React (frontend) và Node.js/Express (backend). Bao gồm REST API, database, authentication.', 'Lập trình Web', 499000, 2, 'published'),
  (3, 'Cơ sở dữ liệu MySQL từ A-Z', 'Học thiết kế, truy vấn, tối ưu hóa cơ sở dữ liệu MySQL. Từ SELECT cơ bản đến JOIN, Subquery, Index, Transaction và Stored Procedure.', 'Cơ sở dữ liệu', 349000, 2, 'published'),
  (4, 'Kiến trúc Microservices', 'Tìm hiểu về kiến trúc microservices, API Gateway, message broker, Docker, và các design pattern phổ biến trong hệ thống phân tán.', 'Kiến trúc phần mềm', 599000, 6, 'published'),
  (5, 'Machine Learning cơ bản', 'Giới thiệu về Machine Learning với Python. Supervised Learning, Unsupervised Learning, Neural Networks cơ bản với scikit-learn và TensorFlow.', 'AI & Machine Learning', 699000, 6, 'published'),
  (6, 'Thiết kế UI/UX cho Developer', 'Các nguyên tắc thiết kế giao diện người dùng, typography, color theory, wireframing, prototyping với Figma và áp dụng vào dự án thực tế.', 'Thiết kế', 249000, 2, 'published'),
  (7, 'DevOps và CI/CD Pipeline', 'Docker, Kubernetes, Jenkins, GitHub Actions. Xây dựng pipeline CI/CD hoàn chỉnh cho dự án phần mềm.', 'DevOps', 549000, 6, 'draft'),
  (8, 'Tiếng Anh cho Lập trình viên', 'Học tiếng Anh chuyên ngành IT: đọc tài liệu kỹ thuật, viết email, giao tiếp trong team quốc tế.', 'Kỹ năng mềm', 199000, 2, 'draft')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- =============================================
-- Seed Data: Lessons for each published course
-- =============================================

-- Course 1: Python (5 lessons)
INSERT INTO lessons (id, course_id, title, content, video_url, order_index) VALUES
  (1,  1, 'Giới thiệu Python & Cài đặt môi trường', 'Python là ngôn ngữ lập trình bậc cao, dễ học và được sử dụng rộng rãi trong nhiều lĩnh vực. Trong bài này chúng ta sẽ cài đặt Python và viết chương trình đầu tiên.', 'https://example.com/videos/python-intro.mp4', 1),
  (2,  1, 'Biến, kiểu dữ liệu và toán tử', 'Tìm hiểu về các kiểu dữ liệu cơ bản: int, float, string, boolean. Cách khai báo biến và sử dụng các toán tử trong Python.', 'https://example.com/videos/python-variables.mp4', 2),
  (3,  1, 'Cấu trúc điều khiển: if/else, vòng lặp', 'Học cách sử dụng câu lệnh điều kiện if/elif/else và các vòng lặp for, while để điều khiển luồng chương trình.', 'https://example.com/videos/python-control.mp4', 3),
  (4,  1, 'Hàm và Module trong Python', 'Định nghĩa hàm, tham số, giá trị trả về. Import và sử dụng các module có sẵn và tự tạo.', 'https://example.com/videos/python-functions.mp4', 4),
  (5,  1, 'Lập trình hướng đối tượng (OOP)', 'Class, Object, Inheritance, Encapsulation, Polymorphism - các khái niệm OOP trong Python.', 'https://example.com/videos/python-oop.mp4', 5),

-- Course 2: React & Node.js (6 lessons)
  (6,  2, 'Tổng quan Full-Stack Development', 'Hiểu về kiến trúc client-server, HTTP, REST API và cách React + Node.js kết hợp với nhau.', 'https://example.com/videos/fullstack-overview.mp4', 1),
  (7,  2, 'React Components & JSX', 'Tạo component, sử dụng JSX, props và state. Hiểu về Virtual DOM và rendering cycle.', 'https://example.com/videos/react-components.mp4', 2),
  (8,  2, 'React Hooks: useState, useEffect', 'Quản lý state và side effects với React Hooks. Custom hooks và best practices.', 'https://example.com/videos/react-hooks.mp4', 3),
  (9,  2, 'Node.js & Express REST API', 'Xây dựng REST API với Express.js: routing, middleware, error handling, validation.', 'https://example.com/videos/nodejs-api.mp4', 4),
  (10, 2, 'Kết nối Database (MySQL/MongoDB)', 'Thiết kế database, kết nối từ Node.js, CRUD operations, query optimization.', 'https://example.com/videos/nodejs-database.mp4', 5),
  (11, 2, 'Authentication & Deployment', 'JWT authentication, bcrypt, CORS. Deploy lên production với Docker và cloud services.', 'https://example.com/videos/auth-deploy.mp4', 6),

-- Course 3: MySQL (4 lessons)
  (12, 3, 'Giới thiệu MySQL & SQL cơ bản', 'Cài đặt MySQL, tạo database, table. Các lệnh SQL cơ bản: SELECT, INSERT, UPDATE, DELETE.', 'https://example.com/videos/mysql-intro.mp4', 1),
  (13, 3, 'JOIN và Subquery nâng cao', 'INNER JOIN, LEFT JOIN, RIGHT JOIN, CROSS JOIN. Subquery, EXISTS, và Common Table Expressions (CTE).', 'https://example.com/videos/mysql-joins.mp4', 2),
  (14, 3, 'Index, Transaction và Stored Procedure', 'Tối ưu hiệu suất với Index. ACID properties, Transaction. Viết Stored Procedure và Trigger.', 'https://example.com/videos/mysql-advanced.mp4', 3),
  (15, 3, 'Thiết kế Database & Normalization', 'Các chuẩn normalization (1NF, 2NF, 3NF). ERD diagram, quan hệ giữa các bảng, best practices.', 'https://example.com/videos/mysql-design.mp4', 4),

-- Course 4: Microservices (5 lessons)
  (16, 4, 'Giới thiệu kiến trúc Microservices', 'So sánh Monolith vs Microservices. Ưu nhược điểm, khi nào nên sử dụng microservices.', 'https://example.com/videos/micro-intro.mp4', 1),
  (17, 4, 'API Gateway & Service Discovery', 'Vai trò của API Gateway, routing, load balancing. Service registry và discovery patterns.', 'https://example.com/videos/micro-gateway.mp4', 2),
  (18, 4, 'Message Broker: RabbitMQ & Kafka', 'Event-driven architecture, pub/sub pattern. So sánh RabbitMQ và Apache Kafka.', 'https://example.com/videos/micro-messaging.mp4', 3),
  (19, 4, 'Docker & Container Orchestration', 'Đóng gói service với Docker, Docker Compose. Giới thiệu Kubernetes cơ bản.', 'https://example.com/videos/micro-docker.mp4', 4),
  (20, 4, 'Design Patterns cho Microservices', 'Saga pattern, Circuit Breaker, CQRS, Event Sourcing. Database per service.', 'https://example.com/videos/micro-patterns.mp4', 5),

-- Course 5: Machine Learning (4 lessons)
  (21, 5, 'Tổng quan Machine Learning', 'ML là gì? Supervised vs Unsupervised vs Reinforcement Learning. Workflow của một dự án ML.', 'https://example.com/videos/ml-overview.mp4', 1),
  (22, 5, 'Linear Regression & Classification', 'Thuật toán hồi quy tuyến tính, Logistic Regression. Đánh giá model với accuracy, precision, recall.', 'https://example.com/videos/ml-regression.mp4', 2),
  (23, 5, 'Decision Tree & Random Forest', 'Thuật toán cây quyết định, ensemble methods. Feature importance và hyperparameter tuning.', 'https://example.com/videos/ml-tree.mp4', 3),
  (24, 5, 'Neural Networks cơ bản', 'Perceptron, activation functions, backpropagation. Xây dựng neural network đầu tiên với TensorFlow.', 'https://example.com/videos/ml-neural.mp4', 4),

-- Course 6: UI/UX (3 lessons)
  (25, 6, 'Nguyên tắc thiết kế UI cơ bản', 'Typography, color theory, spacing, layout grid. Các nguyên tắc Gestalt trong thiết kế.', 'https://example.com/videos/uiux-principles.mp4', 1),
  (26, 6, 'Wireframing & Prototyping với Figma', 'Tạo wireframe, mockup, interactive prototype. Component library và design system.', 'https://example.com/videos/uiux-figma.mp4', 2),
  (27, 6, 'Responsive Design & Accessibility', 'Mobile-first design, media queries, breakpoints. WCAG guidelines và accessible components.', 'https://example.com/videos/uiux-responsive.mp4', 3)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- =============================================
-- Seed Data: Enrollments (student_id=1 is Nguyen Van An, student_id=4, student_id=5)
-- =============================================
INSERT INTO enrollments (id, student_id, course_id, progress_percent, status) VALUES
  (1, 1, 1, 80.00, 'active'),
  (2, 1, 2, 33.33, 'active'),
  (3, 1, 6, 0.00, 'active'),
  (4, 4, 1, 60.00, 'active'),
  (5, 4, 3, 25.00, 'active'),
  (6, 4, 4, 0.00, 'active'),
  (7, 5, 2, 50.00, 'active'),
  (8, 5, 5, 0.00, 'active')
ON DUPLICATE KEY UPDATE progress_percent=VALUES(progress_percent);