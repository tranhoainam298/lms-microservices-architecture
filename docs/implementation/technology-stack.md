# Technology Stack

This document details the selected technologies for the LMS Microservices project and provides the architectural rationale for each decision.

---

## Layer & Technology Breakdown

| Layer | Technology | Reason |
| :--- | :--- | :--- |
| **Web Client** | ReactJS | Matches architecture document and supports dashboard UI. |
| **Mobile Client** | Flutter | Matches architecture document, placeholder for mobile app. |
| **API Gateway** | Node.js + Express | Simple routing, JWT validation, rate limiting. |
| **Microservices** | Node.js + Express | Consistent backend stack. |
| **Databases** | SQL Server | Matches architecture document and supports database-per-service. |
| **Message Broker** | RabbitMQ | Easier local demo for event-driven communication. |
| **External Payment** | ZaloPay/Momo placeholder | External system only. |
| **AI Chatbot** | External AI Chatbot System placeholder | External system only. |
| **Deployment** | Docker Compose later | Local multi-service demo. |
