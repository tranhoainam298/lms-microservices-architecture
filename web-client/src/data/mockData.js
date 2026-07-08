// Mock Database simulating individual Microservice Data Schemas

// 1. User DB (Owned by User Service)
export const mockUsers = [
  { id: 1, email: "student@lms.edu", full_name: "John Student", role: "student" },
  { id: 2, email: "instructor@lms.edu", full_name: "Dr. Jane Instructor", role: "instructor" },
  { id: 3, email: "admin@lms.edu", full_name: "Alice Administrator", role: "admin" }
];

export const mockLoginAuditLogs = [
  { id: 101, user_id: 1, login_status: "success", ip_address: "192.168.1.50", user_agent: "Mozilla/5.0 Chrome/120.0", occurred_at: "2026-07-08T08:30:00Z" },
  { id: 102, user_id: 2, login_status: "success", ip_address: "192.168.1.62", user_agent: "Mozilla/5.0 Safari/17.2", occurred_at: "2026-07-08T09:15:00Z" },
  { id: 103, user_id: 3, login_status: "success", ip_address: "10.0.2.15", user_agent: "Mozilla/5.0 Firefox/121.0", occurred_at: "2026-07-08T10:00:00Z" }
];

// 2. Course DB (Owned by Course Service)
export const mockCourses = [
  { id: 201, instructor_id: 2, title: "Introduction to Microservices", description: "Learn microservices architectural patterns, API Gateways, and event-driven styling using RabbitMQ.", price: 99.00, status: "published", progress_percent: 33 },
  { id: 202, instructor_id: 2, title: "Advanced React with CSS Grid", description: "Design responsive, highly interactive web applications without Tailwind CSS.", price: 49.00, status: "published", progress_percent: 100 },
  { id: 203, instructor_id: 2, title: "Building Scalable T-SQL Schemas", description: "Draft database layouts, foreign key boundaries, and optimize SQL Server database transactions.", price: 79.00, status: "draft", progress_percent: 0 }
];

export const mockLessons = [
  { id: 301, course_id: 201, title: "1.1 Monolith vs Microservices", content_url: "/video/1_1_monolith_vs_microservices.mp4", lesson_order: 1 },
  { id: 302, course_id: 201, title: "1.2 Implementing API Gateways", content_url: "/video/1_2_implementing_api_gateways.mp4", lesson_order: 2 },
  { id: 303, course_id: 201, title: "1.3 Database-per-Service Isolation Rules", content_url: "/video/1_3_db_isolation.mp4", lesson_order: 3 },
  { id: 304, course_id: 202, title: "2.1 Flexbox vs CSS Grid Layouts", content_url: "/video/2_1_css_layouts.mp4", lesson_order: 1 },
  { id: 305, course_id: 202, title: "2.2 Designing Dark Mode and Bento Systems", content_url: "/video/2_2_dark_mode.mp4", lesson_order: 2 }
];

export const mockCourseAccess = [
  { id: 401, user_id: 1, course_id: 201, access_status: "active", activated_at: "2026-07-05T14:22:11Z" },
  { id: 402, user_id: 1, course_id: 202, access_status: "active", activated_at: "2026-07-06T09:11:00Z" }
];

export const mockLearningProgress = [
  { id: 501, user_id: 1, course_id: 201, lesson_id: 301, progress_status: "completed", completed_at: "2026-07-05T16:00:00Z" },
  { id: 502, user_id: 1, course_id: 201, lesson_id: 302, progress_status: "in_progress", completed_at: null },
  { id: 503, user_id: 1, course_id: 201, lesson_id: 303, progress_status: "not_started", completed_at: null }
];

export const mockAiLearningContexts = [
  { id: 601, course_id: 201, lesson_id: 302, context_text: "Student is currently viewing API Gateways and requested information about rate limiting." }
];

// 3. Exam DB (Owned by Exam & Quiz Service)
export const mockQuestionBank = [
  { id: 701, course_id: 201, question_text: "Which service contains business logic for processing user checkout intents?", question_type: "single_choice", options: ["API Gateway", "Payment Service", "User Service", "Course Service"], correct_answer: "Payment Service" },
  { id: 702, course_id: 201, question_text: "True or False: In database-per-service pattern, User Service is allowed to read Exam DB directly.", question_type: "single_choice", options: ["True", "False"], correct_answer: "False" },
  { id: 703, course_id: 201, question_text: "Which protocol is typically used for asynchronous microservice communication?", question_type: "single_choice", options: ["HTTP REST", "AMQP (RabbitMQ)", "gRPC", "SOAP"], correct_answer: "AMQP (RabbitMQ)" }
];

export const mockQuizzes = [
  { id: 801, course_id: 201, title: "Microservices Architecture Basics", status: "published", due_label: "Due Friday at 17:00", question_count: 3 }
];

export const mockQuizQuestions = [
  { id: 901, quiz_id: 801, question_id: 701, question_order: 1 },
  { id: 902, quiz_id: 801, question_id: 702, question_order: 2 },
  { id: 903, quiz_id: 801, question_id: 703, question_order: 3 }
];

export const mockQuizAttempts = [
  { id: 1001, quiz_id: 801, user_id: 1, started_at: "2026-07-07T14:00:00Z", submitted_at: "2026-07-07T14:15:00Z", status: "graded" }
];

export const mockSubmittedAnswers = [
  { id: 1101, attempt_id: 1001, question_id: 701, submitted_answer: "Payment Service", is_correct: true },
  { id: 1102, attempt_id: 1001, question_id: 702, submitted_answer: "False", is_correct: true },
  { id: 1103, attempt_id: 1001, question_id: 703, submitted_answer: "HTTP REST", is_correct: false }
];

export const mockGradingResults = [
  { id: 1201, attempt_id: 1001, score: 2, max_score: 3, passed: true, graded_at: "2026-07-07T14:15:05Z" }
];

// 4. Payment DB (Owned by Payment Service)
export const mockPayments = [
  { id: 1301, user_id: 1, course_id: 201, amount: 99.00, payment_method: "zalopay", payment_status: "completed", created_at: "2026-07-05T14:20:00Z" },
  { id: 1302, user_id: 1, course_id: 202, amount: 49.00, payment_method: "momo", payment_status: "completed", created_at: "2026-07-06T09:10:00Z" }
];

export const mockPaymentTransactions = [
  { id: 1401, payment_id: 1301, gateway_transaction_id: "ZLP-55612349", transaction_status: "success", requested_at: "2026-07-05T14:20:10Z", completed_at: "2026-07-05T14:22:10Z" },
  { id: 1402, payment_id: 1302, gateway_transaction_id: "MM-99882215", transaction_status: "success", requested_at: "2026-07-06T09:10:05Z", completed_at: "2026-07-06T09:11:00Z" }
];

export const mockPaymentGatewayLogs = [
  { id: 1501, payment_id: 1301, gateway_name: "zalopay", request_payload: '{"amount":99.00,"orderId":"1301"}', response_payload: '{"status":1,"message":"Success","appTransId":"55612349"}', status: "200", created_at: "2026-07-05T14:20:12Z" },
  { id: 1502, payment_id: 1302, gateway_name: "momo", request_payload: '{"amount":49.00,"partnerCode":"MOMO"}', response_payload: '{"resultCode":0,"message":"Successful","transId":"99882215"}', status: "200", created_at: "2026-07-06T09:10:07Z" }
];

export const mockRevenueRecords = [
  { id: 1601, payment_id: 1301, course_id: 201, amount: 99.00, recorded_at: "2026-07-05T14:22:11Z" },
  { id: 1602, payment_id: 1302, course_id: 202, amount: 49.00, recorded_at: "2026-07-06T09:11:00Z" }
];

// 5. External AI Chatbot Mock Replies
export const mockAiBotResponses = [
  { keyword: "gateway", reply: "In a microservices architecture, the API Gateway serves as the single entry point. It forwards requests to services (User, Course, Exam, Payment) and handles cross-cutting concerns like authentication, routing, and rate limiting." },
  { keyword: "isolation", reply: "Database-per-service means that each microservice has absolute ownership of its private database. No service can query another service's database directly. For example, User Service accesses User DB only, and Course Service accesses Course DB only." },
  { keyword: "rabbitmq", reply: "RabbitMQ is used for event-driven asynchronous communication. When a student completes checkout, the Payment Service publishes a PaymentSucceededEvent. Course Service consumes this event to activate course access without direct DB links." }
];

export const mockAiSuggestions = [
  "How does an API Gateway route requests?",
  "Why does each service own its database?",
  "When should RabbitMQ be used?"
];

export const mockExperienceFeedback = [
  {
    id: 1,
    quote: "The course experience and the service boundary stay visible together, so the architecture never feels abstract.",
    name: "Minh Anh Tran",
    role: "Software engineering student"
  },
  {
    id: 2,
    quote: "The payment journey shows exactly where responsibility changes without turning the interface into documentation.",
    name: "Khoa Nguyen",
    role: "Architecture reviewer"
  },
  {
    id: 3,
    quote: "I can teach the learning flow and the system design from the same screen.",
    name: "Thu Ha Le",
    role: "Course instructor"
  }
];
