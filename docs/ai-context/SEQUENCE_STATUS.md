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
*   *Status:* **Not Achieved** (Stubs exist, missing student-enrollment validations).

### Sequence 4: Take Quiz
*   *Flow:* Student $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Exam Service $\rightarrow$ Exam DB.
*   *Status:* **Core source aligned; E2E success path blocked by missing safe course enrollment fixture**.

### Sequence 5: Course Payment
*   *Flow:* Student $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Payment Service $\rightarrow$ Payment DB $\rightarrow$ Webhook callback.
*   *Status:* **Not Achieved** (Stubs exist, RabbitMQ trigger enrollment is set up but API Gateway payment route is not configured).

### Sequence 6: Revenue Report
*   *Flow:* Instructor $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Payment Service $\rightarrow$ Payment DB.
*   *Status:* **Not Achieved**.

### Sequence 7: Ask Learning Question (AI Support)
*   *Flow:* Student $\rightarrow$ Web Client $\rightarrow$ API Gateway $\rightarrow$ Course Service $\rightarrow$ Course DB $\rightarrow$ External AI Chatbot System.
*   *Status:* **Not Achieved** (AI Service was relocated to external mock provider area; integration is pending).
