# Architecture Mapping

| Component | Responsibility | Owns Database |
|---|---|---|
| api-gateway | Routing, JWT validation, rate limiting | No |
| user-service | Authentication, profile, role and permission | User DB |
| course-service | Courses, lessons, enrollment/access, progress, AI learning context | Course DB |
| exam-service | Question bank, quiz, answer key, grading, result storage | Exam DB |
| payment-service | Payment transaction, gateway integration, revenue data | Payment DB |
| web-client | ReactJS web client placeholder | No |
| mobile-client | Flutter mobile client placeholder | No |
| infra | Docker, databases, message broker, monitoring, backup | No |
| external-systems | ZaloPay/Momo and AI Chatbot placeholders | No |
| shared | API contracts and event contracts only | No |
