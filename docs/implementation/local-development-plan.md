# Local Docker Runtime

The supported one-click and report/demo runtime is Docker Compose. Run `docker compose up -d --build` or double-click `start-lms.bat`, then open `http://localhost:8080`.

## Port assignments

| Component | Container port | Host port | Notes |
| :--- | :---: | :---: | :--- |
| Nginx load balancer | `80` | `8080` | Default browser entry and `/api` reverse proxy. |
| Web Client | `80` | none | Reached through Nginx. |
| API Gateway | `3000` | `3000` | Host mapping is debug-only; browsers should use Nginx on 8080. |
| User Service | `5001` | none | Internal Docker service. |
| Course Service | `5002` | none | Internal Docker service. |
| Exam Service | `5003` | none | Internal Docker service. |
| Payment Service | `5004` | none | Internal Docker service. |
| External AI adapter | `5005` | none | Internal external-system adapter. |
| External payment compatibility fixture | `8080` | none | Not the main ZaloPay success path. |
| RabbitMQ AMQP | `5672` | `5672` | Broker protocol. |
| RabbitMQ management | `15672` | `15672` | Local developer UI. |
| User MySQL | `3306` | `3316` | User DB only. |
| Course MySQL | `3306` | `3317` | Course DB only. |
| Exam MySQL | `3306` | `3308` | Exam DB only. |
| Payment MySQL | `3306` | `3309` | Payment DB only. |

Host ports can be overridden by the variables documented in `.env.example`.

## Container communication

Containers use Docker DNS names, never host `localhost`, for service-to-service traffic:

- API Gateway calls `user-service:5001`, `course-service:5002`, `exam-service:5003`, and `payment-service:5004`.
- Exam Service calls Course Service over HTTP for authorization; it does not connect to Course DB.
- Payment Service calls Course Service over authenticated internal HTTP for purchase metadata, access activation, and report metadata; it does not connect to Course DB.
- User, Course, and Payment services publish to `rabbitmq:5672`.
- Each business service joins only its own data network. The optional backup profile is the only component that can read all four DB networks.

Do not start the Docker production Web Client at `localhost:5173`; that port is only for an explicitly launched Vite development server.
