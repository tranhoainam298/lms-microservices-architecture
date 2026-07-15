# Service Build Order

This document records the dependency-aware order for maintaining or rebuilding the implemented stack.

---

## Recommended Build Sequence

### 1. Shared contracts
Define standard error formats, JWT payload interfaces, and event schema models inside the `shared/` directory first. This establishes common contracts used by all microservices.

### 2. Database schemas
Bootstrap the database tables (creation scripts and indices) for all 4 databases to establish the structure of the data layer.

### 3. User Service
Build authentication, user management, and login auditing handlers. Since other services depend on users and their authentication tokens, this service must be established early.

### 4. Course Service
Build endpoints to save course drafts, manage lessons, and track lesson progress. This forms the educational backbone of the platform.

### 5. Exam & Quiz Service
Build quiz administration and submission grading tools. This service references Course IDs for context.

### 6. Payment Service
Build billing structures, payment intents, and external transaction logging. This integrates with external payment gateways.

### 7. API Gateway
Configure proxy route mappings to User, Course, Exam, and Payment services. Implement authentication verification handlers and rate limit boundaries.

### 8. Web Client
Build user interfaces using ReactJS to support authentication, lesson interaction, quiz assessments, and checkout sequences.

### 9. RabbitMQ event integration
Connect User, Payment, and Course publishers to the durable `lms_events` topic exchange. Course access remains an idempotent synchronous Course Service operation; events are asynchronous architectural notifications and do not perform a second enrollment write.

### 10. Reporting and AI support flows
Implement the cross-service data aggregation for reports (Payment + Course) and connect the AI query routes to the external AI Chatbot System.
