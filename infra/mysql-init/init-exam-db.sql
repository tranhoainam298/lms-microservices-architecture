-- =============================================
-- LMS Exam Database - Schema & Seed Data
-- =============================================

CREATE TABLE IF NOT EXISTS quizzes (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  CourseId INT NOT NULL,
  InstructorId INT NOT NULL,
  Title VARCHAR(255) NOT NULL,
  Description LONGTEXT NULL,
  TimeLimitMinutes INT NOT NULL DEFAULT 30,
  PassingScore INT NOT NULL DEFAULT 60,
  Status VARCHAR(20) NOT NULL DEFAULT 'draft',
  CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UpdatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  CourseId INT NOT NULL,
  QuizId INT NOT NULL,
  Topic VARCHAR(255) NOT NULL,
  Content LONGTEXT NOT NULL,
  Options JSON NOT NULL,
  CorrectAnswer VARCHAR(255) NOT NULL,
  Difficulty VARCHAR(50) NOT NULL DEFAULT 'medium',
  Points DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  OrderIndex INT NOT NULL DEFAULT 1,
  CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT FK_questions_quizzes_QuizId FOREIGN KEY (QuizId) REFERENCES quizzes(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_results (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  StudentId INT NOT NULL,
  QuizId INT NOT NULL,
  Score DECIMAL(10,2) NOT NULL DEFAULT 0,
  MaximumScore DECIMAL(10,2) NOT NULL DEFAULT 0,
  Percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  Passed TINYINT(1) NOT NULL DEFAULT 0,
  SubmittedAnswers JSON NOT NULL,
  SubmittedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY UX_quiz_results_StudentId_QuizId (StudentId, QuizId),
  CONSTRAINT FK_quiz_results_quizzes_QuizId FOREIGN KEY (QuizId) REFERENCES quizzes(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Seed Data: Quizzes
-- =============================================
INSERT INTO quizzes (Id, CourseId, InstructorId, Title, Description, TimeLimitMinutes, PassingScore, Status) VALUES
  (1, 1, 2, 'Kiểm tra Python cơ bản', 'Bài kiểm tra kiến thức Python cơ bản: biến, kiểu dữ liệu, vòng lặp, hàm.', 20, 60, 'published'),
  (2, 1, 2, 'Kiểm tra OOP Python', 'Bài kiểm tra về lập trình hướng đối tượng trong Python.', 25, 70, 'published'),
  (3, 2, 2, 'Kiểm tra React cơ bản', 'Kiểm tra kiến thức về React Components, JSX, Props, State.', 30, 60, 'published'),
  (4, 3, 2, 'Kiểm tra SQL cơ bản', 'Kiểm tra các lệnh SQL: SELECT, INSERT, UPDATE, DELETE, JOIN.', 25, 60, 'published'),
  (5, 4, 6, 'Kiểm tra Microservices', 'Kiểm tra kiến thức về kiến trúc microservices, API Gateway, message broker.', 30, 70, 'published'),
  (6, 5, 6, 'Kiểm tra Machine Learning', 'Kiểm tra các khái niệm ML cơ bản, thuật toán và đánh giá model.', 35, 60, 'draft')
ON DUPLICATE KEY UPDATE Title=VALUES(Title);

-- =============================================
-- Seed Data: Questions for Quiz 1 (Python cơ bản)
-- =============================================
INSERT INTO questions (Id, CourseId, QuizId, Topic, Content, Options, CorrectAnswer, Difficulty, Points, OrderIndex) VALUES
  (1, 1, 1, 'Kiểu dữ liệu', 'Kiểu dữ liệu nào sau đây KHÔNG phải là kiểu dữ liệu cơ bản trong Python?', '["int", "float", "char", "bool"]', 'char', 'easy', 10.00, 1),
  (2, 1, 1, 'Biến', 'Cách khai báo biến nào sau đây là hợp lệ trong Python?', '["int x = 5", "x = 5", "var x = 5", "let x = 5"]', 'x = 5', 'easy', 10.00, 2),
  (3, 1, 1, 'Vòng lặp', 'Output của đoạn code sau là gì?\nfor i in range(3):\n    print(i, end=\" \")', '["1 2 3", "0 1 2", "0 1 2 3", "1 2"]', '0 1 2', 'medium', 10.00, 3),
  (4, 1, 1, 'Hàm', 'Từ khóa nào dùng để định nghĩa hàm trong Python?', '["function", "def", "fn", "func"]', 'def', 'easy', 10.00, 4),
  (5, 1, 1, 'List', 'Phương thức nào dùng để thêm phần tử vào cuối list?', '["add()", "push()", "append()", "insert()"]', 'append()', 'easy', 10.00, 5),

-- Questions for Quiz 2 (OOP Python)
  (6, 1, 2, 'Class', 'Từ khóa nào dùng để tạo class trong Python?', '["class", "Class", "struct", "object"]', 'class', 'easy', 10.00, 1),
  (7, 1, 2, 'Inheritance', 'Đâu là cú pháp đúng để kế thừa class trong Python?', '["class Dog extends Animal:", "class Dog(Animal):", "class Dog inherits Animal:", "class Dog : Animal:"]', 'class Dog(Animal):', 'medium', 10.00, 2),
  (8, 1, 2, 'Constructor', 'Method nào được gọi tự động khi tạo object mới?', '["__init__", "__new__", "__create__", "constructor"]', '__init__', 'easy', 10.00, 3),
  (9, 1, 2, 'self', 'Tham số "self" trong method của class dùng để làm gì?', '["Khai báo biến static", "Tham chiếu đến instance hiện tại", "Import module", "Định nghĩa constructor"]', 'Tham chiếu đến instance hiện tại', 'medium', 10.00, 4),

-- Questions for Quiz 3 (React cơ bản)
  (10, 2, 3, 'JSX', 'JSX là viết tắt của gì?', '["JavaScript XML", "Java Syntax Extension", "JSON Extra", "JavaScript Extension"]', 'JavaScript XML', 'easy', 10.00, 1),
  (11, 2, 3, 'State', 'Hook nào dùng để quản lý state trong functional component?', '["useEffect", "useState", "useContext", "useReducer"]', 'useState', 'easy', 10.00, 2),
  (12, 2, 3, 'Props', 'Props trong React có đặc điểm gì?', '["Có thể thay đổi (mutable)", "Chỉ đọc (read-only)", "Chỉ dùng cho class component", "Không thể truyền function"]', 'Chỉ đọc (read-only)', 'medium', 10.00, 3),
  (13, 2, 3, 'Component', 'React component nào sau đây là functional component hợp lệ?', '["function App() { return <div/> }", "class App { render() {} }", "const App = <div/>", "App() => <div/>"]', 'function App() { return <div/> }', 'easy', 10.00, 4),

-- Questions for Quiz 4 (SQL cơ bản)
  (14, 3, 4, 'SELECT', 'Câu lệnh nào dùng để lấy tất cả dữ liệu từ bảng users?', '["GET * FROM users", "SELECT * FROM users", "FETCH * FROM users", "READ * FROM users"]', 'SELECT * FROM users', 'easy', 10.00, 1),
  (15, 3, 4, 'JOIN', 'INNER JOIN trả về kết quả gì?', '["Tất cả bản ghi từ bảng trái", "Tất cả bản ghi từ bảng phải", "Chỉ các bản ghi khớp ở cả hai bảng", "Tất cả bản ghi từ cả hai bảng"]', 'Chỉ các bản ghi khớp ở cả hai bảng', 'medium', 10.00, 2),
  (16, 3, 4, 'WHERE', 'Toán tử nào dùng để tìm kiếm theo pattern trong SQL?', '["MATCH", "LIKE", "SEARCH", "FIND"]', 'LIKE', 'easy', 10.00, 3),
  (17, 3, 4, 'GROUP BY', 'Hàm nào đếm số bản ghi trong SQL?', '["SUM()", "COUNT()", "TOTAL()", "NUM()"]', 'COUNT()', 'easy', 10.00, 4),

-- Questions for Quiz 5 (Microservices)
  (18, 4, 5, 'Kiến trúc', 'Đặc điểm chính của kiến trúc microservices là gì?', '["Một ứng dụng monolithic lớn", "Các service nhỏ, độc lập, giao tiếp qua API", "Chỉ dùng một database duy nhất", "Không cần containerization"]', 'Các service nhỏ, độc lập, giao tiếp qua API', 'easy', 10.00, 1),
  (19, 4, 5, 'API Gateway', 'Vai trò chính của API Gateway trong microservices là gì?', '["Lưu trữ dữ liệu", "Điểm truy cập duy nhất cho tất cả client requests", "Quản lý source code", "Chạy unit tests"]', 'Điểm truy cập duy nhất cho tất cả client requests', 'medium', 10.00, 2),
  (20, 4, 5, 'Message Broker', 'RabbitMQ là gì?', '["Database", "Message Broker", "API Gateway", "Load Balancer"]', 'Message Broker', 'easy', 10.00, 3),
  (21, 4, 5, 'Docker', 'Dockerfile dùng để làm gì?', '["Viết unit test", "Định nghĩa cách build Docker image", "Kết nối database", "Quản lý dependencies"]', 'Định nghĩa cách build Docker image', 'medium', 10.00, 4)
ON DUPLICATE KEY UPDATE Content=VALUES(Content);

-- =============================================
-- Seed Data: Quiz Results
-- =============================================
INSERT INTO quiz_results (Id, StudentId, QuizId, Score, MaximumScore, Percentage, Passed, SubmittedAnswers, SubmittedAt) VALUES
  (1, 1, 1, 40.00, 50.00, 80.00, 1, JSON_ARRAY(), '2025-06-01 10:15:00'),
  (2, 4, 1, 30.00, 50.00, 60.00, 1, JSON_ARRAY(), '2025-06-02 14:18:00'),
  (3, 1, 3, 30.00, 40.00, 75.00, 1, JSON_ARRAY(), '2025-06-05 09:25:00')
ON DUPLICATE KEY UPDATE Score=VALUES(Score), MaximumScore=VALUES(MaximumScore), Percentage=VALUES(Percentage), Passed=VALUES(Passed);
