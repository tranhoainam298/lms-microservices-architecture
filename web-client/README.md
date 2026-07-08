# LMS Microservices Platform - Web Client UI Scaffold

This directory contains the React + Vite UI prototype scaffold for the Learning Management System (LMS) Microservices architecture.

> [!IMPORTANT]
> The current setup is a **frontend UI prototype only**. It uses local React states and simulated mock databases to represent microservice boundaries. No backend APIs are connected, no databases have been created on the host machine, and no live SQL Server connections are active.

---

## Architecture Alignment

All pages and flows are built to match the operations and database schemas defined in the architecture mapping docs:
1. **User Service & User DB**: Authentication login flow with role lookup (`LoginPage.jsx`).
2. **Course Service & Course DB**: Syllabus lessons, active access checks (`LessonPage.jsx`), and course drafts creation (`InstructorCourseDraft.jsx`).
3. **Exam Service & Exam DB**: Assessment questions and scoring (`QuizPage.jsx`).
4. **Payment Service & Payment DB**: Simulates ZaloPay/Momo callbacks and logging (`PaymentPage.jsx`).
5. **RabbitMQ Event-Driven Integration**: Confirmed checkouts trigger a simulated `PaymentSucceededEvent` callback to Course Service to activate active access records.
6. **Reporting & AI Chatbot Systems**: Reconstructed as mock dashboard aggregates and external chatbot assistants without dedicated database layers.

---

## Project Structure

```
web-client/
├── package.json          - Dev scripts & dependencies
├── index.html            - Vite mount HTML
├── README.md             - Setup instructions
└── src/
    ├── main.jsx          - Mount entry point
    ├── App.jsx           - Route Orchestrator & State store
    ├── data/
    │   └── mockData.js   - Mock databases for User, Course, Exam, & Payment DBs
    ├── styles/
    │   └── global.css    - Styling and Variables design tokens
    ├── components/
    │   ├── AppShell.jsx  - Sidebar + Header grid shell
    │   ├── Sidebar.jsx   - Role-based dark sidebar navigation
    │   ├── Header.jsx    - Top bar containing profile summary
    │   ├── StatCard.jsx  - Numeric analytics card
    │   ├── CourseCard.jsx- Details card for catalogs
    │   └── StatusBadge.jsx- Active/Pending/Failed tags
    └── pages/
        ├── LoginPage.jsx - Role selection login form
        ├── StudentDashboard.jsx - Catalog, Quick Actions, & Recent Invoices
        ├── InstructorCourseDraft.jsx - Create Draft Course forms
        ├── LessonPage.jsx- Media player mockup & completion toggle
        ├── QuizPage.jsx  - Questions card & scoring engine
        ├── PaymentPage.jsx- ZaloPay/Momo gateway checkout mockup
        ├── AdminRevenueReport.jsx - Sales ledger statistics
        └── AiSupportPage.jsx - AI Bot chat prompt mockup
```

---

## How to Run Locally (After Installation Phase is Initiated)

1. Navigate to the client folder:
   ```bash
   cd web-client
   ```
2. Install standard dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the portal at the port indicated in your CLI (typically `http://localhost:5173`).
