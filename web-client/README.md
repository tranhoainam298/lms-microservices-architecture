# LMS Microservices Platform - Web Client UI Scaffold

This directory contains the React + Vite UI prototype scaffold for the Learning Management System (LMS) Microservices architecture.

> [!IMPORTANT]
> Login and Save Draft Course are the implemented backend flows. Other screens still use local React state and mock data. No SQL Server connections are active.

## Login Flow

`LoginPage.jsx` sends `email`, `password`, and `role` to the API Gateway at `http://localhost:3000/auth/login`. The Gateway forwards the request to the User Service. On success, `App.jsx` stores the returned `accessToken`, `userProfile`, and `role` in React state and opens the dashboard for that role.

The API Gateway and User Service must both be running before testing real login. If either backend process is unavailable, the login form remains usable and shows a connection error.

## Course Draft Flow

`InstructorCourseDraft.jsx` sends draft course data and the logged-in instructor's mock access token to `http://localhost:3000/courses/draft`. The API Gateway forwards the request to the Course Service on port `3002`. Draft persistence is mock/in-memory only until backend database integration.

---

## Architecture Alignment

All pages and flows are built to match the operations and database schemas defined in the architecture mapping docs:
1. **User Service**: Real login API with a mock user store and role lookup (`LoginPage.jsx`). User DB is not connected yet.
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
