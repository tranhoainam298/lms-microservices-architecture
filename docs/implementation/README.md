# Technology Stack & Implementation Plan

This directory contains implementation planning documents for the Learning Management System (LMS) Microservices project.

> [!IMPORTANT]
> The current phase is **documentation only**. No implementation code, package configurations, Docker configuration files, database migration scripts, or actual code modifications have been introduced.

## Contents

This folder contains the following planning documents:

1. **[technology-stack.md](file:///D:/github%20tool/lms-microservices-architecture/docs/implementation/technology-stack.md)**: Details of chosen technologies and frameworks for the client apps, backend gateway, database models, messaging systems, and external dependencies.
2. **[development-phases.md](file:///D:/github%20tool/lms-microservices-architecture/docs/implementation/development-phases.md)**: A 12-phase roadmap leading from initial design up to final integrated end-to-end demonstrations.
3. **[service-build-order.md](file:///D:/github%20tool/lms-microservices-architecture/docs/implementation/service-build-order.md)**: Explains the recommended build sequence based on service dependency mappings.
4. **[local-development-plan.md](file:///D:/github%20tool/lms-microservices-architecture/docs/implementation/local-development-plan.md)**: Details the planned port assignments for the frontend, backend microservices, MySQL databases, and RabbitMQ instance during local development.
5. **[rabbitmq-event-flow.md](file:///D:/github%20tool/lms-microservices-architecture/docs/implementation/rabbitmq-event-flow.md)**: Focuses on RabbitMQ configurations, listing the events published by each service, and documenting decoupled messaging flows.
6. **[implementation-boundaries.md](file:///D:/github%20tool/lms-microservices-architecture/docs/implementation/implementation-boundaries.md)**: Documents strict boundaries, isolation rules, and architectural constraints to prevent scope creep.
