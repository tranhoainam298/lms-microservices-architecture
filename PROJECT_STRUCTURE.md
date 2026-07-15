# Project Structure

This view highlights active runtime code and the documentation/infrastructure that supports it. Some service roots retain historical scaffold directories; the active entry points are listed explicitly below.

```text
lms-microservices-architecture/
|-- README.md
|-- Description.txt
|-- ARCHITECTURE_MAPPING.md
|-- PROJECT_STRUCTURE.md
|-- docker-compose.yml
|-- start-lms.bat
|-- repair-db-users*.bat
|
|-- api-gateway/
|   |-- Dockerfile
|   |-- package.json
|   `-- src/
|       |-- server.js
|       |-- middleware/          # JWT, rate limits, error handling
|       |-- routes/              # auth, users, courses, exams, payments
|       `-- proxy/               # four service HTTP proxies
|
|-- user-service/
|   |-- Dockerfile
|   |-- package.json
|   `-- src/
|       |-- server.js
|       |-- controllers/
|       |-- routes/
|       |-- services/            # auth/profile/admin/activity rules
|       |-- data/                # User DB, audit, additive migrations
|       |-- events/              # UserLoggedInEvent publisher
|       `-- middleware/
|
|-- course-service/
|   |-- Dockerfile
|   |-- package.json
|   `-- src/
|       |-- server.js
|       |-- controllers/
|       |-- routes/
|       |-- services/            # catalog/authoring/access/progress/reports/AI context
|       |-- data/                # Course DB, progress/uniqueness migrations, event publisher
|       |-- middleware/
|       `-- rabbitmq-listener.js # compatibility no-op; sync activation is authoritative
|
|-- exam-service/
|   |-- ExamService.csproj
|   |-- Program.cs               # ASP.NET host, JWT, EF Core, Course HttpClient
|   |-- Controllers/
|   |   `-- QuizController.cs
|   |-- Data/                    # ExamDbContext and additive schema migrator
|   |-- Models/                  # Quiz, Question, QuizResult
|   `-- DTOs/
|
|-- payment-service/
|   |-- Dockerfile
|   |-- package.json
|   |-- index.js                 # JWT, ZaloPay, Payment DB, Course calls, revenue
|   `-- src/events/              # PaymentSucceeded/PaymentFailed publisher
|
|-- web-client/
|   |-- Dockerfile
|   |-- package.json
|   `-- src/
|       |-- App.jsx
|       |-- config/api.js        # /api browser base
|       |-- components/
|       |-- pages/               # role/product pages
|       `-- styles/
|
|-- external-systems/
|   |-- ai-chatbot-system/mock-provider/
|   |   # Legacy path name; active /chat calls a real configured AI provider
|   `-- payment-gateway-zalopay-momo/mock-provider/
|       # Local compatibility fixture, not main ZaloPay completion
|
|-- infra/
|   |-- nginx/load-balancer.conf
|   |-- mysql-init/              # one safe fresh schema per owned DB
|   `-- backup/                  # optional timestamped logical dumps
|
|-- shared/
|   |-- api-contracts/           # actual HTTP contracts
|   `-- event-contracts/         # lms_events schemas/semantics
|
|-- docs/
|   |-- architecture/            # final views, mappings, matrix, verification
|   |-- diagrams/sequence/       # seven Mermaid sequence sources
|   |-- requirements/
|   |-- decisions/
|   |-- deployment/
|   `-- ai-context/
|
|-- tests/                       # focused architecture/security/integration scripts
|-- scripts/                     # safe PowerShell helpers
|-- mobile-client/               # placeholder; no working Docker deployment
`-- .project-skills/
```

## Runtime entry points

| Component | Entry point | Internal port |
|---|---|---:|
| Nginx | `infra/nginx/load-balancer.conf` | 80 (host 8080) |
| Web Client | built via `web-client/Dockerfile` | 80 |
| API Gateway | `api-gateway/src/server.js` | 3000 |
| User Service | `user-service/src/server.js` | 5001 |
| Course Service | `course-service/src/server.js` | 5002 |
| Exam Service | `exam-service/Program.cs` | 5003 |
| Payment Service | `payment-service/index.js` | 5004 |
| External AI adapter | `external-systems/ai-chatbot-system/mock-provider/index.js` | 5005 |

The active databases are four separate MySQL containers. RabbitMQ is the only message broker. Empty or historical layer directories are not evidence of an additional deployed module.
