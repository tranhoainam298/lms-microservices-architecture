# Implementation Boundaries

This document defines strict boundaries, isolation constraints, and design rules to preserve the microservices architecture, avoid scope creep, and prevent coupling.

---

## Strict Architectural Rules

### 1. Service Boundaries
- **Rule**: Do not create or run any backend services outside the five explicitly approved services:
  1. API Gateway
  2. User Service
  3. Course Service
  4. Exam & Quiz Service
  5. Payment Service
- **Rule**: Do not implement a separate **Reporting Service** or a separate **Chatbot Service**. Reporting features are built into Payment/Course services, and AI Chatbot routing is built into Course Service.

### 2. Database Boundaries
- **Rule**: Do not create or run databases outside the four explicitly allowed databases:
  1. User DB (owned by User Service)
  2. Course DB (owned by Course Service)
  3. Exam DB (owned by Exam & Quiz Service)
  4. Payment DB (owned by Payment Service)
- **Rule**: Do not create a Reporting DB, Chatbot DB, Learning Result DB, Notification DB, or Enrollment DB.

### 3. Isolation Rules
- **Rule**: A microservice must never access another service's database directly. No SQL connection sharing or cross-schema joins.
- **Rule**: All data sharing must go through APIs or event flows via the Message Broker (RabbitMQ).

### 4. Code & Logic Boundaries
- **Rule**: Do not put backend business logic inside the **API Gateway**. The gateway must only perform routing, reverse proxying, authentication/JWT validation, and rate limiting.
- **Rule**: Do not put shared business logic in the `shared/` directory. The `shared/` directory should only house common utilities, logging libraries, error definitions, and interface types. Putting business logic in `shared/` introduces tight code-level coupling.

### 5. Third-Party / External System Boundaries
- **Rule**: External systems, such as **Momo/ZaloPay** and the **AI Chatbot System**, must remain mocked or represented as placeholders until the dedicated integration phase. No real credentials or SDK implementations should be added until then.
