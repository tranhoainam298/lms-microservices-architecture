# Development Phases

This document details the step-by-step roadmap to implement the LMS microservices platform in 12 sequential, controlled phases.

---

## Roadmap Overview

### Phase 1: Documentation baseline
Establish architecture mapping, database design docs, technology stack decisions, local development plan, and RabbitMQ messaging boundaries.

### Phase 2: Database schema and migrations
Create SQL migration scripts and database schemas for User DB, Course DB, Exam DB, and Payment DB.

### Phase 3: Service skeletons
Bootstrap Node.js/Express applications for each microservice (User Service, Course Service, Exam Service, Payment Service) and API Gateway. Define standard project structures and initial package dependencies.

### Phase 4: API Gateway routing
Implement routing rules, JWT authentication validation middleware, and request forwarding inside the API Gateway.

### Phase 5: User Service login
Implement authentication handlers, token generation, user profiles, roles lookup, and login auditing in the User Service and its SQL Server database.

### Phase 6: Course Service course and lesson flows
Implement endpoints to save course drafts, view lessons, verify access constraints, and record lesson progress in the Course DB.

### Phase 7: Exam Service quiz flow
Implement quiz generation, question retrieval, attempt submission tracking, and automated grading logic inside the Exam DB.

### Phase 8: Payment Service payment flow and RabbitMQ event
Build the payment integration flow with external gateways, log transaction details, publish `PaymentSucceededEvent` to RabbitMQ, and implement the event consumer in Course Service to activate access.

### Phase 9: Reporting API
Develop cross-service querying pathways to aggregate revenue logs and course metrics via Payment Service and Course Service without a central database.

### Phase 10: AI Support API
Expose AI querying endpoints that fetch context summaries and redirect formatted prompts to the external AI Chatbot System.

### Phase 11: Web Client UI
Implement user login views, course dashboards, video lesson viewers, quiz forms, and mock checkout components using ReactJS.

### Phase 12: Integration testing and final demo
Conduct end-to-end user journey tests across all microservices, RabbitMQ, and the Web UI. Resolve bugs and present the final integrated local system.
