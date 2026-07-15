# Docker Deployment Simulation

This is the local Docker Compose deployment of the LMS architecture. It supports demonstrations, focused runtime verification, and report evidence; it is not a production cloud deployment.

## Runtime topology

| Deployment concern | Compose component |
|---|---|
| Browser entry / load balancer | `nginx-load-balancer` |
| Web application | `web-client` |
| Single API entry | `api-gateway` |
| Approved business services | `user-service`, `course-service`, `exam-service`, `payment-service` |
| Message Broker | `rabbitmq` |
| Service-owned databases | `user-db-mysql`, `course-db-mysql`, `exam-db-mysql`, `payment-db-mysql` |
| External AI system | `external-ai-chatbot-mock` (legacy compatibility name; active real-provider adapter) |
| External payment simulation | `external-payment-gateway-mock` (deployment-only external mock; not the active ZaloPay checkout path) |
| Backup server simulation | `database-backup-server` in the optional `backup` profile |

The normal browser path is:

`http://localhost:8080 -> /api -> nginx-load-balancer -> api-gateway -> owning service`

The Docker-built Web Client uses `VITE_API_BASE_URL=/api`. Nginx strips `/api` before proxying to the Gateway. Nginx never routes API calls directly to a business service, and the browser never uses Docker service hostnames.

## Containers and ports

| Container | Container port | Default host exposure |
|---|---:|---:|
| `nginx-load-balancer` | 80 | 8080 |
| `web-client` | 80 | internal only |
| `api-gateway` | 3000 | 3000 (debug only) |
| `user-service` | 5001 | internal only |
| `course-service` | 5002 | internal only |
| `exam-service` | 5003 | internal only |
| `payment-service` | 5004 | internal only |
| `rabbitmq` | 5672 / 15672 | 5672 / 15672 |
| `user-db-mysql` | 3306 | 3316 |
| `course-db-mysql` | 3306 | 3317 |
| `exam-db-mysql` | 3306 | 3308 |
| `payment-db-mysql` | 3306 | 3309 |
| `external-ai-chatbot-mock` | 5005 | internal only |
| `external-payment-gateway-mock` | 8080 | internal only |
| `database-backup-server` | n/a | disabled by default |

The Gateway exposes route groups `/auth`, `/users`, `/courses`, `/exams`, and `/payments`. It forwards Authorization, request method/body, and downstream status; it contains no business-database access.

## Networks and database ownership

| Service | Application database | Data network |
|---|---|---|
| User Service | `lms_user_db` on `user-db-mysql` | `user-data-network` |
| Course Service | `lms_course_db` on `course-db-mysql` | `course-data-network` |
| Exam Service | `lms_exam_db` on `exam-db-mysql` | `exam-data-network` |
| Payment Service | `lms_payment_db` on `payment-db-mysql` | `payment-data-network` |

Each data network is internal and contains only its owning service, database, and the optional backup container. Cross-domain communication uses the shared application network and HTTP:

- Exam Service -> Course Service for course ownership/student exam access.
- Payment Service -> Course Service for authoritative purchase metadata, enrollment activation, and minimal report metadata.
- Course Service -> external AI adapter for lesson-context questions.

No service connects directly to another service's database.

## RabbitMQ

`rabbitmq` is attached to the internal `messaging-network`. User, Payment, and Course Services publish versioned persistent messages to the durable topic exchange `lms_events`:

- `user.loggedin`
- `payment.succeeded`
- `payment.failed`
- `course.access.activated`

The Payment Service still activates access synchronously through the protected Course Service internal endpoint. The events describe completed domain transitions and must not perform duplicate enrollment writes. Current publishers use confirmation and safe logging; no transactional outbox is implemented.

## External integrations

### ZaloPay

The active paid-course flow calls ZaloPay Sandbox directly from Payment Service using server-side configuration. The external payment mock container represents the deployment diagram's external-system node for local simulation; it is not used to declare a payment successful in the normal Web Client flow. `/payments/mock/complete` remains deprecated/disabled by default.

Required live Sandbox values must be placed in an uncommitted `.env`:

```text
ZALOPAY_APP_ID
ZALOPAY_KEY1
ZALOPAY_KEY2
```

Without valid values, checkout returns the documented safe configuration error. No production ZaloPay endpoint or real-money flow is used.

### AI provider

The external AI system retains the directory `external-systems/ai-chatbot-system/mock-provider` and Compose name `external-ai-chatbot-mock` only for compatibility. Its active `/chat` implementation calls the configured real provider with a server-side `AI_API_KEY`; it does not return canned answers. Course Service knows only `AI_CHATBOT_URL` and sends enrolled lesson context.

Without a key, the container can remain healthy/degraded while `/chat` returns `AI_PROVIDER_NOT_CONFIGURED`.

## Configuration

Copy `.env.example` to an uncommitted `.env` and replace local demonstration placeholders as needed. Do not commit secrets. Internal addresses use Docker DNS names, for example:

```text
USER_SERVICE_URL=http://user-service:5001
COURSE_SERVICE_URL=http://course-service:5002
EXAM_SERVICE_URL=http://exam-service:5003
PAYMENT_SERVICE_URL=http://payment-service:5004
EXTERNAL_AI_CHATBOT_URL=http://external-ai-chatbot-mock:5005
RABBITMQ_URL=amqp://rabbitmq:5672
```

MySQL initialization environment values apply only when a named volume is first initialized. Reusing a volume with older credentials may require the repository's non-destructive credential-alignment scripts; these scripts never remove volumes or modify LMS application rows.

## Start, verify, and stop

### Windows one-click startup

Double-click `start-lms.bat`. It starts the root Compose stack, waits for health, checks the public endpoint, and opens:

```text
http://localhost:8080
```

Port 5173 is used only when an explicit Vite development server is running. The normal launcher does not run Exam Service with local `dotnet run` and does not run Payment Service with a nonexistent host `dev` script.

If logs contain a MySQL `Access denied for user` error:

1. Run `repair-db-users.bat`.
2. If root authentication is stale too, run `repair-db-users-emergency.bat` explicitly.
3. Run `start-lms.bat` again.

Both repair paths require confirmation and are designed to align only MySQL account credentials. The emergency path is never invoked automatically.

### CLI

From the repository root:

```powershell
docker compose up -d --build
docker compose ps
curl.exe http://localhost:8080/health
```

Stop containers without deleting persistent data:

```powershell
docker compose down
```

Never use these commands for this project:

```text
docker compose down -v
docker system prune
docker volume prune
```

Useful endpoints:

- LMS: `http://localhost:8080`
- Public health: `http://localhost:8080/health`
- Gateway debug port: `http://localhost:3000`
- RabbitMQ management: `http://localhost:15672`

## Final local verification snapshot

The final architecture-alignment build was verified without resetting any named volume:

- `docker compose config -q`: PASS.
- `docker compose up -d --build`: PASS.
- `docker compose ps`: 14/14 normal LMS containers healthy.
- `GET http://localhost:8080/health`: HTTP 200 with status `ok`.
- Public Student/Instructor/Admin route harness: 16/16 PASS.
- Current-route smoke harness: 25 PASS, 0 FAIL, 1 intentional skip; the skipped quiz submission was covered by the role harness.
- Real RabbitMQ exclusive queue: all four routing keys captured, with one enrollment after repeated activation and none after payment failure.

Live provider status is intentionally separate: the checked environment contained placeholders for `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`, and `AI_API_KEY`. Payment missing-configuration behavior returned HTTP 503 without creating a transaction; enrolled AI ask returned HTTP 503 `AI_PROVIDER_NOT_CONFIGURED` without a canned answer.

## Non-destructive backup profile

The backup service is disabled during normal startup. Run one backup explicitly:

```powershell
docker compose --profile backup run --rm database-backup-server
```

It writes a new UTC timestamp directory in the `db-backup-data` named volume:

```text
/backups/YYYYMMDD-HHMMSS/user-db.sql
/backups/YYYYMMDD-HHMMSS/course-db.sql
/backups/YYYYMMDD-HHMMSS/exam-db.sql
/backups/YYYYMMDD-HHMMSS/payment-db.sql
```

The script uses a consistent, non-locking dump, refuses to reuse an existing timestamp directory, and performs no import, delete, truncate, reset, or schema mutation.

## Known limitations

- Local Docker Compose only; no production Kubernetes/cloud deployment is claimed.
- An unrelated local Compose project named `costops` can collide with generic container names; use an explicit Compose project name when both stacks must coexist.
- Mobile client remains an external placeholder and is not containerized.
- ZaloPay live Sandbox verification depends on uncommitted sandbox credentials; localhost callback reachability normally requires signed polling.
- AI live verification depends on an uncommitted `AI_API_KEY`.
- Momo is an architectural alternative, not an implemented provider adapter.
- RabbitMQ publication has publisher confirms but no transactional outbox, so a narrow commit-to-publish failure window remains.
- Backup scheduling, retention, encryption, restore automation, and off-host storage are not implemented.
