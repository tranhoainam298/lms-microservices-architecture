# Implementation Milestones

This file records the current progression rather than an unimplemented roadmap.

1. **Architecture baseline** — the five approved core components, four service-owned databases, external payment/AI systems, and RabbitMQ boundary are documented.
2. **MySQL schemas** — canonical fresh-boot schemas live under `infra/mysql-init/`; additive runtime compatibility migrations remain inside their owning services.
3. **Core services and Gateway** — User, Course, Exam, Payment, and API Gateway run in Docker with health checks and service-name networking.
4. **User flow** — registration, login, JWT, profile, admin user operations, login audit, and `UserLoggedInEvent` publication are source complete.
5. **Course flow** — catalog, instructor drafts/lessons, publishing, enrollment checks, protected learning, lesson completion, and progress are source complete.
6. **Exam flow** — secure quiz authoring, publishing, loading without answers, server grading, duplicate protection, and results are source complete.
7. **Payment flow** — backend-priced ZaloPay Sandbox checkout/query/callback is implemented. A successful transition publishes `PaymentSucceededEvent`, then uses the synchronous internal Course API for immediate idempotent access activation. A failed transition publishes `PaymentFailedEvent` and never activates access.
8. **Reporting** — Payment Service aggregates revenue from Payment DB and requests minimal Course metadata through the protected Course API. Course, Exam, and User reports remain with their respective data owners.
9. **AI support** — Course Service builds enrolled lesson context and calls the external AI adapter. The adapter uses a server-side provider key and returns a configuration error instead of a fake answer when the key is absent.
10. **Product UI** — active role navigation uses real protected APIs for learning, quiz, payment, AI, course authoring, user administration, and revenue reporting.
11. **RabbitMQ verification** — versioned contracts and a unique temporary-queue integration harness cover `user.loggedin`, `payment.succeeded`, `payment.failed`, and `course.access.activated`.
12. **Final verification** — focused security tests, builds, Compose validation, runtime health, and role-based E2E evidence determine final readiness.

Live ZaloPay and AI verification remain credential-dependent. Source completion must not be described as live provider verification when the corresponding local credentials are absent.
