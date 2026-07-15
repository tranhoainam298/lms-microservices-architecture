# Implementation Status

Current status of core features across the codebase.

| Use Case | Status | Detail |
|---|---|---|
| **1. Login & Registration** | **Achieved** | Token issuance, JWT authorization middleware, password encryption, and instructor/student roles verified. |
| **2. Save Draft Course** | **Achieved** | Transactional course creation with optional initial lessons array. Atomic database inserts (in Course DB) rollback completely on failure. Enforced by tests. |
| **3. View Lesson Content** | **Achieved** | Student JWT, published-course enrollment checks, real lesson resources, idempotent per-lesson completion, and persisted Course DB progress are active. |
| **4. Take Quiz** | **Achieved** | Enrolled E2E load/submit passed through Nginx and Gateway; answer keys stayed private, grading ignored forged client scores, the result persisted in Exam DB, and duplicate submission returned a safe conflict. |
| **5. Pay for Course** | **ZaloPay Sandbox implementation complete; live create blocked without credentials** | Checkout signs Sandbox v2 create requests, Web Client opens `order_url` and polls signed v2 query status, callbacks require Key2 MAC, and paid confirmation activates Course DB enrollment through Course Service. |
| **6. Revenue Report** | **Achieved** | Admin-only `GET /payments/reports/revenue` passed 401/401/403/403/200 runtime authorization checks through Nginx and Gateway. `totalTransactions` counts all attempts; revenue and average order value count only canonical `success` transactions. Payment Service reads Payment DB, requests minimal metadata only for referenced IDs from the protected Course Service endpoint, and returns the real summary, breakdown, and ledger to the Admin UI. |
| **7. AI Chatbot Support** | **Real provider integration implemented; live provider call blocked without `AI_API_KEY`** | Lesson Viewer asks through Gateway and Course Service; Course Service verifies enrollment and supplies Course DB context to the external provider adapter. No canned fallback is active. |

## Deployment simulation

| Capability | Status | Detail |
|---|---|---|
| Local Docker deployment view | **Implemented** | Browser traffic uses Nginx `/api` before the Gateway; Gateway routes all four core services, and the optional `backup` profile simulates a non-destructive Database Backup Server. Runtime validation is tracked in `docs/deployment/DOCKER_DEPLOYMENT.md`. |
| User-facing UI cleanup | **Achieved** | Active Student, Instructor, and Admin screens pass the banned architecture-label scan; legacy architecture components are not imported or reachable from normal navigation. |
