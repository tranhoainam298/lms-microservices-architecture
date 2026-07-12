# Docker Deployment Simulation

This deployment is a local Docker Compose simulation of the LMS deployment view. It is intended for demonstrations and reports; it is not a production or cloud deployment.

## Architecture mapping

| Deployment layer | Docker simulation |
|---|---|
| Client | `web-client`; the Flutter/mobile client remains an external client |
| Load balancer | `nginx-load-balancer` |
| Gateway | `api-gateway` |
| Application services | `user-service`, `course-service`, `exam-service`, `payment-service` |
| Messaging | `rabbitmq` |
| Database server | Four isolated MySQL containers and named volumes |
| External systems | `external-ai-chatbot-mock` (real-provider adapter; compatibility name), `external-payment-gateway-mock` |
| Backup server | Optional `database-backup-server` profile writing timestamped SQL dumps |

The default browser entry is `http://localhost:8080`. The Docker-built web client uses the relative base URL `/api`, producing the flow Browser → `nginx-load-balancer` → `api-gateway` → the selected core service. Nginx strips `/api` and sends the remaining path only to the Gateway. All other requests go to the web client; Nginx never routes browser traffic directly to a microservice.

## Containers and ports

| Container | Container port | Default host port |
|---|---:|---:|
| `nginx-load-balancer` | 80 | 8080 |
| `web-client` | 80 | internal only |
| `api-gateway` | 3000 | 3000 |
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
| `database-backup-server` | none | disabled by default (`backup` profile) |

Gateway host port 3000 remains available for local debugging. Normal browser traffic uses the load balancer on port 8080 and `/api`; it does not use the direct Gateway port.

The Gateway routes `/auth`, `/users`, `/courses`, `/exams`, and `/payments`. The Payment route remains a transparent proxy to `payment-service:5004`; checkout, mock completion, trusted pricing, and Course Service enrollment activation remain owned by backend services.

## Database ownership

Each service is attached only to its own internal database network:

- User Service → `user-db-mysql` / `lms_user_db` / `user-db-data`
- Course Service → `course-db-mysql` / `lms_course_db` / `course-db-data`
- Exam Service → `exam-db-mysql` / `lms_exam_db` / `exam-db-data`
- Payment Service → `payment-db-mysql` / `lms_payment_db` / `payment-db-data`

Exam Service calls Course Service over HTTP for course-access checks. It is not connected to the Course DB network.

## External systems

The external AI adapter retains the path `external-systems/ai-chatbot-system/mock-provider` and container name `external-ai-chatbot-mock` for deployment compatibility, but its active `/chat` route calls the configured real provider and never returns canned fallback answers. The provider key is supplied only to this container. The payment mock remains under `external-systems/payment-gateway-zalopay-momo/mock-provider`.

## Configuration

Copy `.env.example` to `.env` and replace the demonstration placeholders before starting. Do not commit real credentials. Container-to-container values use Docker DNS names, including:

```text
USER_SERVICE_URL=http://user-service:5001
COURSE_SERVICE_URL=http://course-service:5002
EXAM_SERVICE_URL=http://exam-service:5003
PAYMENT_SERVICE_URL=http://payment-service:5004
RABBITMQ_URL=amqp://rabbitmq:5672
```

When reusing already initialized named volumes, the database credentials supplied at startup must match the credentials with which those volumes were initialized. MySQL initialization variables do not change credentials in an existing data directory.

## Start and stop

### Windows one-click startup

On Windows, double-click `start-lms.bat` in the repository root. The launcher uses the root Docker Compose deployment, builds and starts the containers, waits for their health checks, verifies the public health endpoint, and opens:

```text
http://localhost:8080
```

Port `5173` is only for an explicitly started Vite development server; the normal Docker demo does not use it. The launcher does not run Node or .NET services directly on the host.

If Exam, Payment, Course, or User Service logs report `Access denied for user` after reusing an older MySQL named volume, run `repair-db-users.bat` first. The normal repair asks for confirmation and aligns the four MySQL application-user passwords when the existing root login still works.

If the normal repair reports that root authentication failed, run `repair-db-users-emergency.bat`. The emergency helper requires a second explicit confirmation, processes one database at a time, detects the named volume mounted at `/var/lib/mysql`, temporarily stops its original container, and starts a non-published temporary MySQL container against that same volume with grant checks disabled. It changes only MySQL system-account credentials and the application user's existing database grant, stops the temporary container, restarts the original database, and verifies both root and application-user login. It never removes or recreates the named volume and never changes LMS application tables. Emergency repair is never invoked automatically by `start-lms.bat`.

Recovery order:

```text
1. repair-db-users.bat
2. repair-db-users-emergency.bat   (only if root authentication failed)
3. start-lms.bat
```

Live provider features additionally require these values in a local, uncommitted `.env` file:

```text
ZALOPAY_APP_ID
ZALOPAY_KEY1
ZALOPAY_KEY2
AI_API_KEY
```

Missing provider credentials do not prevent the LMS from starting; the related live payment or AI operation returns its safe configuration error.

From the repository root:

```powershell
docker compose up --build
```

To stop without deleting persistent database or RabbitMQ data:

```powershell
docker compose down
```

Never use these commands for this project:

```text
docker compose down -v
docker system prune
docker volume prune
```

## Verification

- Web/load balancer: `http://localhost:8080`
- Load balancer health: `http://localhost:8080/health`
- API Gateway debug port: `http://localhost:3000`
- RabbitMQ management UI: `http://localhost:15672`
- Container state: `docker compose ps`
- Configuration validation: `docker compose config`

The four database containers and RabbitMQ should report `healthy`. Application healthchecks are non-destructive HTTP/TCP readiness checks.

## Backup simulation

The `database-backup-server` is disabled during normal `docker compose up --build`. Run one backup explicitly with:

```powershell
docker compose --profile backup run --rm database-backup-server
```

Each run creates a new UTC timestamp directory in the `db-backup-data` named volume:

```text
/backups/YYYYMMDD-HHMMSS/user-db.sql
/backups/YYYYMMDD-HHMMSS/course-db.sql
/backups/YYYYMMDD-HHMMSS/exam-db.sql
/backups/YYYYMMDD-HHMMSS/payment-db.sql
```

The script uses `mysqldump --single-transaction --skip-lock-tables`, suppresses generated drop-table statements, refuses to reuse an existing timestamp directory, and never imports, deletes, truncates, resets, or alters database data. It exits non-zero and identifies the database if a dump fails; earlier backup directories remain untouched.

## Known limitations

- This is local Docker deployment only, not a production cloud topology.
- The mobile client is a placeholder/external client and is not containerized.
- ZaloPay integration uses Sandbox create/query endpoints only. Sandbox credentials are not committed; without them, checkout reports `ZALOPAY_NOT_CONFIGURED`. A localhost callback is generally unreachable externally, so the Web Client relies on status polling.
- AI lesson support is wired through the external real-provider adapter. Without an externally supplied `AI_API_KEY`, the container remains healthy/degraded and `/chat` returns `AI_PROVIDER_NOT_CONFIGURED`; it never generates a fallback answer.
- Local Vite development falls back to `http://localhost:3000`; Docker production builds explicitly use `/api` through Nginx.
- Existing User and Course DB initialization scripts are mounted safely. The current Exam Service migrator upgrades existing tables but does not create the base Exam schema on a completely empty volume. This simulation therefore reuses the existing initialized `infra_exam_db_data` volume; a fresh-install bootstrap requires a separate approved additive migration task.
- Backup execution is manual and intended only as a local simulation; scheduling and retention are not implemented.
