# Known Gaps

Only current, evidence-based limitations are listed here. Completed final-branch checks are recorded in the architecture verification ledger rather than kept as gaps.

## Intentionally deferred product scope

- Standalone category-entity CRUD is deferred. Categories remain validated Course DB values managed through real course create/update and Admin course-category operations; no Category Service or fake standalone UI is introduced.
- The public demo course covers currently use safe external placeholder URLs. Core learning content remains usable if those images are unavailable, but a fully offline branded asset pack is a future presentation improvement.
- The public-path CRUD harness retains exact published verification fixtures because the production business rules correctly forbid deleting published courses/quizzes. It uses unique identifiers and never performs broad cleanup; an isolated disposable Compose project would be preferable for repeated CI runs.

## External credential-dependent verification

1. **ZaloPay Sandbox:** the source integration is complete, but live create/query/payment verification requires locally configured `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, and `ZALOPAY_KEY2`. No credential is committed. A localhost callback is generally unreachable from ZaloPay, so local completion relies on signed status polling.
2. **AI provider:** the external adapter source is complete, but a live answer requires a non-placeholder `AI_API_KEY`. Without it, `/chat` returns `AI_PROVIDER_NOT_CONFIGURED`; it does not generate a fake answer.
3. **Momo:** the final architecture permits ZaloPay/Momo, but the executable provider is ZaloPay Sandbox. Momo is not implemented and is not claimed as live.

## Message delivery limitation

The User, Payment, and Course producers use persistent AMQP messages and publisher confirmation on the durable `lms_events` topic exchange. They do not yet use transactional outbox tables. Therefore:

- owning-service database state remains authoritative and consistent if RabbitMQ is unavailable;
- login does not fail solely because its non-critical audit event cannot be published;
- enrollment activation remains the synchronous, idempotent Payment Service -> Course Service path;
- a process/broker failure between database commit and publish can lose an asynchronous event.

Any future outbox must live inside the producing service's existing database; no shared outbox database or new service is permitted.

## Architecture and product verification completed

- The real exclusive/auto-delete RabbitMQ queue captured all four routing keys. Repeated activation left one enrollment; failed payment created none.
- The baseline public-path Student, Instructor, and Admin harness passed 16/16, including quiz persistence and Revenue Report RBAC/calculation. This does not replace the feature-branch seeded-data/CRUD/UI verification listed above.
- Thirteen focused static/security suites, changed-file syntax checks, Web Client and Exam builds, Compose validation, and the active-UI label scan passed.
- `docker compose up -d --build` passed; 14 LMS containers were healthy and public `/health` returned HTTP 200.
- The collision-safe demo seed passed twice with identical totals, the product CRUD/RBAC harness passed 18/18, and the real browser rendered non-zero dashboards while traversing every active role menu.

## Deployment limitations

- Docker Compose is a local deployment simulation, not a production cloud topology.
- A Compose project-name collision with an unrelated local `costops` environment was observed; use an explicit project name when both stacks must coexist.
- The mobile client remains a placeholder/external client.
- The backup profile is manual; production scheduling, retention, encryption, and off-host storage are not implemented.
- Current event publication and local MySQL topology are suitable for demonstration and architecture verification, not a production availability guarantee.
