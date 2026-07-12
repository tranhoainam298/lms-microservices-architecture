# Sequence Status

Reference mapping of the 7 sequence diagrams from the authoritative design:

### Sequence 1: User Login
*   *Flow:* User $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ User Service $\rightarrow$ User DB.
*   *Status:* **Achieved** (Active).

### Sequence 2: Course Catalog Search
*   *Flow:* Student $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Course Service $\rightarrow$ Course DB.
*   *Status:* **Achieved** (Active).

### Sequence 3: View Lesson Content
*   *Flow:* Student $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Course Service $\rightarrow$ Course DB.
*   *Status:* **Achieved** (JWT student access, active enrollment, real resources, and persisted completion are implemented).

### Sequence 4: Take Quiz
*   *Flow:* Student $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Exam Service $\rightarrow$ Exam DB.
*   *Status:* **Achieved**. Enrolled student load/submit passed through the Gateway, questions excluded answer keys, server grading persisted the result, and role/access/duplicate protections passed.

### Sequence 5: Course Payment
*   *Flow:* Student $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Payment Service $\rightarrow$ Payment DB $\rightarrow$ Webhook callback.
*   *Status:* **ZaloPay Sandbox source flow aligned; live provider create requires sandbox credentials**. Browser uses Nginx/Gateway, Payment Service owns signed create/query/callback and Payment DB state, then calls Course Service after paid confirmation.

### Sequence 6: Revenue Report
*   *Flow:* Instructor $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Payment Service $\rightarrow$ Payment DB.
*   *Status:* **Not Achieved**.

### Sequence 7: Ask Learning Question (AI Support)
*   *Flow:* Student $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Course Service $\rightarrow$ Course DB $\rightarrow$ External AI Chatbot System.
*   *Status:* **Real provider integration implemented; live provider call requires `AI_API_KEY`**. Course Service supplies enrolled lesson context to the external provider adapter; no frontend/provider shortcut or canned fallback is active.
