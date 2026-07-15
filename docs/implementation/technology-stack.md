# Technology Stack

This table describes the current executable repository.

| Layer | Implemented technology | Runtime responsibility |
| :--- | :--- | :--- |
| Web Client | React + Vite | Student, instructor, and admin product UI; production build calls relative `/api`. |
| Mobile Client | Flutter placeholder only | Architectural client placeholder; no runnable mobile application is claimed. |
| Edge | Nginx | Public `http://localhost:8080` entry, static Web Client, and `/api` forwarding only to API Gateway. |
| API Gateway | Node.js 20 + Express | JWT validation, rate limiting, and proxy routes for User, Course, Exam, and Payment. |
| User Service | Node.js 20 + Express | Accounts, authentication, profiles, administration, login audit, and login event publication. |
| Course Service | Node.js 20 + Express | Catalog, authoring, lessons, enrollments, progress, course reports, and AI context orchestration. |
| Exam & Quiz Service | ASP.NET Core + EF Core | Quiz authoring, secure quiz delivery, server-side grading, and result persistence. |
| Payment Service | Node.js 20 + Express | ZaloPay Sandbox checkout/query/callback, Payment DB state, events, and revenue aggregation. |
| Databases | Four independent MySQL 8 containers | User, Course, Exam, and Payment each own one database and one named volume. |
| Message Broker | RabbitMQ topic exchange | Durable `lms_events` publication for the four versioned architectural events. |
| External payment | ZaloPay Sandbox v2 | Real provider adapter; live calls require local sandbox credentials. Momo is an architectural alternative, not a claimed implementation. |
| External AI | Server-side provider adapter | Calls the configured real AI provider; live answers require `AI_API_KEY` and have no canned fallback. |
| Deployment | Docker Compose + Nginx | Local report/demo topology; not a production cloud deployment. |

No real provider secret belongs in source control. Missing ZaloPay or AI credentials block only the corresponding live external call, not container startup or source validation.
