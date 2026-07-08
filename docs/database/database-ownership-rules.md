# Database Ownership and Isolation Rules

This document establishes the strict rules governing database ownership, isolation, and access within the LMS microservices architecture. These rules ensure microservices autonomy, security, and schema stability.

---

## 1. Single Ownership Rule
Each of the 4 allowed databases is owned by exactly one microservice. The owner service has absolute authority over its database schema, read operations, and write operations.

- **User Service** exclusively owns and accesses **User DB**.
- **Course Service** exclusively owns and accesses **Course DB**.
- **Exam & Quiz Service** exclusively owns and accesses **Exam DB**.
- **Payment Service** exclusively owns and accesses **Payment DB**.

---

## 2. No Direct Cross-Database Access
- No microservice is allowed to establish direct database connections (e.g., via JDBC/ODBC, SQL connection strings) to any database it does not own.
- No database-level cross-joins, database links, or shared database instances between different services are permitted.
- If Service A needs data from Database B, it must obtain it by calling an API endpoint exposed by Service B, or by consuming events published by Service B.

---

## 3. Data Integration Constraints

### Reporting Integration
- **Constraint**: There is **no Reporting DB** or dedicated reporting service database.
- **Rule**: Reporting data must be dynamically aggregated by querying the **Payment Service** (for revenue, transaction statistics) and the **Course Service** (for course metadata, enrollment numbers). Reports are composed via orchestrators or gateway-level queries rather than a centralized query against a shared database.

### AI Chatbot Integration
- **Constraint**: There is **no Chatbot DB** or chatbot-specific service database.
- **Rule**: AI support features must interact with the **Course Service** to store and retrieve AI context (`ai_learning_context`) and lesson details, and communicate with the external **AI Chatbot System**. No private database may be created or maintained for the chatbot.

### Learning Results and Course Progress
- **Constraint**: There is **no Learning Result DB** or **Enrollment DB**.
- **Rule**: 
  - Quiz attempts, submitted answers, and quiz grades must reside in the **Exam DB** (owned by the Exam & Quiz Service).
  - Lesson progress, course completion states, and active course access records must reside in the **Course DB** (owned by the Course Service).

---

## 4. Policy Enforcement and Auditing
- **CI/CD Checks**: Environment configurations must be audited to ensure service deployments do not possess database connection credentials for databases owned by other services.
- **Code Review**: PRs containing direct database connections to foreign schemas will be automatically rejected.
