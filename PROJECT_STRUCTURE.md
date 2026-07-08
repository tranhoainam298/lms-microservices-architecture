# Project Structure

```
lms-microservices-architecture/
├── README.md
├── PROJECT_STRUCTURE.md
├── ARCHITECTURE_MAPPING.md
├── .gitignore
├── api-gateway/
│   └── README.md
├── user-service/
│   ├── api/
│   ├── application/
│   ├── db/
│   │   ├── migrations/
│   │   └── seed/
│   ├── domain/
│   ├── events/
│   ├── infrastructure/
│   ├── tests/
│   └── README.md
├── course-service/
│   ├── api/
│   ├── application/
│   ├── db/
│   │   ├── migrations/
│   │   └── seed/
│   ├── domain/
│   ├── events/
│   ├── infrastructure/
│   ├── tests/
│   └── README.md
├── exam-service/
│   ├── api/
│   ├── application/
│   ├── db/
│   │   ├── migrations/
│   │   └── seed/
│   ├── domain/
│   ├── events/
│   ├── infrastructure/
│   ├── tests/
│   └── README.md
├── payment-service/
│   ├── api/
│   ├── application/
│   ├── db/
│   │   ├── migrations/
│   │   └── seed/
│   ├── domain/
│   ├── events/
│   ├── infrastructure/
│   ├── integrations/
│   │   └── zalo-pay-momo/
│   ├── tests/
│   └── README.md
├── web-client/
│   ├── app/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── tests/
│   └── README.md
├── mobile-client/
│   ├── app/
│   ├── screens/
│   ├── services/
│   ├── tests/
│   ├── widgets/
│   └── README.md
├── infra/
│   ├── backup/
│   ├── databases/
│   ├── docker/
│   ├── env/
│   ├── message-broker/
│   ├── monitoring/
│   └── README.md
├── external-systems/
│   ├── ai-chatbot/
│   ├── payment-gateway/
│   └── README.md
├── shared/
│   ├── api-contracts/
│   ├── docs/
│   ├── event-contracts/
│   └── README.md
├── docs/
│   ├── requirements/
│   │   ├── problem-requirements.md
│   │   ├── functional-requirements.md
│   │   ├── use-case-list.md
│   │   ├── constraints.md
│   │   ├── quality-attributes.md
│   │   └── README.md
│   ├── architecture/
│   │   ├── architecture-style.md
│   │   ├── context-diagram.md
│   │   ├── module-view.md
│   │   ├── component-connector-view.md
│   │   ├── deployment-view.md
│   │   ├── sequence-diagrams.md
│   │   └── README.md
│   ├── decisions/
│   │   ├── AD01-microservices.md
│   │   ├── AD02-api-gateway.md
│   │   ├── AD03-database-per-service.md
│   │   ├── AD04-message-broker.md
│   │   ├── AD05-external-services.md
│   │   └── README.md
│   ├── diagrams/
│   │   ├── context/
│   │   ├── module-view/
│   │   ├── component-connector/
│   │   ├── deployment/
│   │   ├── sequence/
│   │   └── README.md
│   └── README.md
└── .project-skills/
    ├── README.md
    └── copied-skills-report.md
```
