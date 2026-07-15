# Next Tasks

This list contains only work that remains after source alignment and final local verification. The 9/9 static suite, 38/38 Node syntax checks, Web and Exam builds, Compose rebuild/health, four-event RabbitMQ capture, and 16/16 role E2E are complete. This file must not be read as a request to add new core services or databases.

## Credential-dependent verification

1. Configure ZaloPay Sandbox credentials outside Git and run one create/query cycle. Manually complete an order only in the sandbox; verify successful polling activates course access once.
2. Configure `AI_API_KEY` outside Git and run one enrolled lesson question through Nginx, Gateway, Course Service, and the external provider adapter.

## Production-hardening backlog

1. Evaluate per-service transactional outboxes if at-least-once event publication becomes a production requirement. Outbox tables must remain inside User, Payment, or Course DB respectively.
2. Define production backup scheduling, retention, encryption, restore drills, and off-host storage; keep the current local backup profile non-destructive.
3. Define production observability and alerting for API latency, provider failures, RabbitMQ publication failures, and database health without adding an unapproved business microservice.
4. Implement a Momo adapter only if it becomes an explicit executable requirement; until then document it as an architectural alternative.
