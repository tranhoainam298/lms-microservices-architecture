# Next Tasks

This list starts after the completed architecture baseline and business CRUD/demo-data product pass. It must not be read as a request to add new core services or databases.

## Product follow-ups

1. If repeated automated E2E becomes routine, run the CRUD harness in an isolated disposable Compose project so published verification fixtures do not accumulate in a developer's persistent demo volume.
2. Add local branded course-cover assets if the demo must be completely offline; the current external placeholders are presentation-only and do not affect course access.
3. Add a standalone Course DB category entity only if it becomes an explicit business requirement. Until then, keep the real course-owned category update and do not introduce a Category Service.

## Credential-dependent verification

1. Configure ZaloPay Sandbox credentials outside Git and run one create/query cycle. Manually complete an order only in the sandbox; verify successful polling activates course access once.
2. Configure `AI_API_KEY` outside Git and run one enrolled lesson question through Nginx, Gateway, Course Service, and the external provider adapter.

## Production-hardening backlog

1. Evaluate per-service transactional outboxes if at-least-once event publication becomes a production requirement. Outbox tables must remain inside User, Payment, or Course DB respectively.
2. Define production backup scheduling, retention, encryption, restore drills, and off-host storage; keep the current local backup profile non-destructive.
3. Define production observability and alerting for API latency, provider failures, RabbitMQ publication failures, and database health without adding an unapproved business microservice.
4. Implement a Momo adapter only if it becomes an explicit executable requirement; until then document it as an architectural alternative.
