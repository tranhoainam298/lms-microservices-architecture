# Local Development Plan

This document outlines the network configurations and local port mappings allocated for running the microservices, clients, databases, and message brokers on a single development machine.

> [!NOTE]
> These values represent **planning values only** for deployment design. No configurations, Docker containers, database setups, or applications have been initialized in this step, and no database has been started yet.

---

## Network Port Assignments

| Component / Service | Local Port | Default Protocol | Description |
| :--- | :---: | :--- | :--- |
| **API Gateway** | `3000` | HTTP | Single public entry point for client applications. |
| **User Service** | `3001` | HTTP | Backend authentication and accounts service. |
| **Course Service** | `3002` | HTTP | Backend course syllabus and tracking service. |
| **Exam Service** | `3003` | HTTP | Backend assessments and quiz scoring service. |
| **Payment Service** | `3004` | HTTP | Backend checkouts and invoice handling service. |
| **Web Client** | `5173` | HTTP | ReactJS client dashboard application (Vite default). |
| **RabbitMQ** | `5672` | AMQP | Message broker event listening interface. |
| **RabbitMQ Management UI** | `15672` | HTTP | Broker monitoring console for developers. |
| **SQL Server User DB** | `14331` | TCP/SQL Server | Database instance dedicated to the User Service. |
| **SQL Server Course DB** | `14332` | TCP/SQL Server | Database instance dedicated to the Course Service. |
| **SQL Server Exam DB** | `14333` | TCP/SQL Server | Database instance dedicated to the Exam Service. |
| **SQL Server Payment DB** | `14334` | TCP/SQL Server | Database instance dedicated to the Payment Service. |

---

## Service Communication Architecture

During local development, services communicate in two ways:
1. **Synchronous Requests**: Services reach other services directly using localhost URLs and the specific ports listed above (e.g., Course Service calls User Service on `http://localhost:3001`).
2. **Asynchronous Events**: Services connect to the RabbitMQ broker at `amqp://localhost:5672` to publish and consume system events.
