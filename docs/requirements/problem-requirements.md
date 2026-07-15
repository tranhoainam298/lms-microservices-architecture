# Problem Requirements

## Business problem

Training materials, learner progress, assessment results, and management reports are often fragmented across tools and manual processes. This makes online access inconsistent, delays academic and financial reporting, and gives learners limited support outside instructor hours.

The LMS centralizes course authoring, learning, assessment, payment, reporting, and contextual AI assistance while preserving clear ownership of business data.

## Objectives

- Give students one place to register, discover courses, purchase access, learn from video/document resources, track progress, take quizzes, view results, and ask lesson-context questions.
- Give instructors controlled tools to author courses, lessons, resources, quizzes, and answer keys and to monitor learners in their own courses.
- Give administrators role-protected user management, course governance, and reporting capabilities.
- Automate grading and ensure that paid-course access is activated only after a verified payment result.
- Support independent evolution and scaling of the User, Course, Exam & Quiz, and Payment domains.

## Actors and system boundary

The human actors are Student, Instructor/Teacher, and Admin. ZaloPay/Momo and the AI Chatbot System are external systems. RabbitMQ is infrastructure inside the deployed LMS environment, not a business service.

The core LMS contains exactly four business services and four service-owned databases:

- User Service and User DB
- Course Service and Course DB
- Exam & Quiz Service and Exam DB
- Payment Service and Payment DB

The API Gateway is the client entry point. No service may read or write another service's database.

## Delivery scope

The seven important flows used as the MVP architecture and verification focus are Login, Save Draft Course, View Lesson, Take Quiz, Pay for Course, View Revenue Report, and Ask Learning Question.

The Word scope also describes password recovery, discussions, essay assessment, bulk question import, instructor analytics, course moderation/categories, report export, and notification management. These remain traceable requirements, but their inclusion here does not claim they are implemented. Implementation evidence and remaining gaps are maintained separately in the alignment matrix and implementation-status documents.
