# AD03 - Database per Service

## Status
Accepted

## Context
Identity, learning, assessment, and payment data have different owners and security rules. Direct cross-domain SQL would couple deployments, bypass service authorization, and undermine independent evolution.

## Decision
Use exactly four MySQL databases: User DB owned by User Service, Course DB owned by Course Service, Exam DB owned by Exam & Quiz Service, and Payment DB owned by Payment Service. API Gateway and external systems own no LMS application database. Cross-domain data is requested through protected REST APIs or conveyed through RabbitMQ events.

## Consequences
- Schema and migrations remain local to their owning service, with separate Docker volumes and data networks.
- No service may import another domain's database client, connection string, hostname, or credentials.
- Cross-service reports require service composition; for example, Payment Service reads Payment DB and requests minimal course metadata from Course Service.
- Local transactions cannot atomically span services, so synchronous authority, idempotency, and safe retry behavior are required.
