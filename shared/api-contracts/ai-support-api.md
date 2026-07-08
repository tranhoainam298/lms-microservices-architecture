# AI Support API Contract

**Entry point:** API Gateway
**Owner flow:** API Gateway → Course Service → Course DB → AI Chatbot System

> **Note:** There is no separate Chatbot Service or Chatbot DB. The AI support flow is handled by Course Service, which provides learning context from Course DB to the external AI Chatbot System.

---

## POST /ai/question

### Description

Allows a student to ask a learning question within the context of a specific course and lesson. Course Service retrieves the relevant learning context from Course DB and forwards the question along with the context to the external AI Chatbot System.

### Request

```
POST /ai/question
Content-Type: application/json
Authorization: Bearer {accessToken}
```

| Field | Type | Required | Description |
|---|---|---|---|
| studentId | string | Yes | ID of the student asking the question |
| courseId | string | Yes | ID of the course for context |
| lessonId | string | Yes | ID of the current lesson for context |
| question | string | Yes | The student's question text |

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| answer | string | AI-generated answer to the student's question |
| sourceContext | string | Summary of the learning context used to generate the answer |
| fallbackMessage | string | Displayed if the AI cannot provide a confident answer (e.g., "Please contact your instructor for further help.") |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 403 | ACCESS_DENIED | Student does not have active access to this course |
| 404 | NOT_FOUND | Course or lesson does not exist |
| 503 | AI_SERVICE_UNAVAILABLE | External AI Chatbot System is not available |

### Data Flow

1. Client sends question to API Gateway
2. API Gateway forwards request to Course Service
3. Course Service retrieves learning context (lesson content, course outline) from Course DB
4. Course Service sends the question + context to the external AI Chatbot System
5. AI Chatbot System returns an answer
6. Course Service returns the answer, sourceContext, and fallbackMessage to API Gateway
7. API Gateway returns response to Client

### Related Sequence Diagram

**Sequence Diagram — AI Support: Ask Learning Question**
