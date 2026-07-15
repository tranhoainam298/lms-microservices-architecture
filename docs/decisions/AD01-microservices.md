# AD01 - Microservices Architecture

## Status
Accepted

## Context
The LMS contains distinct identity, course/learning, assessment, and payment domains with different data, security, scaling, and external-integration concerns. A single shared application/database would make ownership and independent change difficult.

## Decision
Use four core business services only: User Service, Course Service, Exam & Quiz Service, and Payment Service. Clients enter through the API Gateway. RabbitMQ is infrastructure, while the payment gateway and AI Chatbot System remain external. Reporting/analytics are capabilities inside approved services and the Web Client, not a fifth business service.

## Consequences
- Each domain can evolve and scale independently behind stable API/event contracts.
- Authentication, authorization, distributed failure handling, internal-service authentication, and operational monitoring must be explicit.
- Cross-domain work requires REST or events and cannot use another service's database.
- The architecture intentionally rejects separate Analytics, Reporting, Notification, Enrollment, and AI core services for the selected scope.
