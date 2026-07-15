# Lesson AI Support API Contract

**Public owner:** Course Service

**Database:** Course DB

**External dependency:** External AI Chatbot System

**Public endpoint:** `POST /api/courses/lessons/:lessonId/ai/ask`

There is no AI core microservice or Chatbot DB. Course Service owns access validation and learning context; the external adapter alone calls the configured real provider.

## Request

Requires a valid student JWT and active enrollment in the lesson's published course.

```json
{
  "question": "Explain the key idea in this lesson."
}
```

The trimmed question must contain 1–1000 characters. The request does not accept `studentId`, `courseId`, provider URL, provider key, or context supplied by the browser as authority.

Course Service derives `studentId` from JWT, finds the lesson and parent course, checks active enrollment, and loads this Course DB context:

- course title and description;
- lesson title;
- video/document resource metadata;
- stored course progress percentage.

It sends `{ question, context }` to the external adapter's internal `POST /chat` endpoint. It does not send JWTs, passwords, payment data, database credentials, internal service secrets, or a full user profile.

## Success

`200`:

```json
{
  "answer": "...",
  "model": "gpt-4o-mini",
  "provider": "openai",
  "usage": {
    "inputTokens": null,
    "outputTokens": null
  }
}
```

Course Service validates that the external response contains a non-empty answer before returning it.

## Errors

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_LESSON_ID` / `VALIDATION_ERROR` | Invalid route ID or question length/type. |
| 401 | `UNAUTHORIZED` / `INVALID_TOKEN` | JWT missing or invalid. |
| 403 | `FORBIDDEN` | Authenticated role is not student. |
| 403 | `COURSE_ACCESS_REQUIRED` | Lesson course is unpublished or student is not actively enrolled. |
| 404 | `LESSON_NOT_FOUND` | Lesson does not exist. |
| 500 | `AI_CONTEXT_LOAD_FAILED` | Course DB context could not be loaded. |
| 502 | `AI_SUPPORT_UNAVAILABLE` | Adapter/network unavailable. |
| 502 | `AI_PROVIDER_UNAVAILABLE` | Provider request failed. |
| 502 | `AI_PROVIDER_RESPONSE_INVALID` / `AI_RESPONSE_INVALID` | Provider/adapter response lacked a valid answer. |
| 503 | `AI_PROVIDER_NOT_CONFIGURED` | External adapter has no non-placeholder `AI_API_KEY`. |

No error path returns a canned or simulated answer.

## External adapter interface

Course Service calls `POST /chat` on `AI_CHATBOT_URL`:

```json
{
  "question": "...",
  "context": {
    "courseTitle": "...",
    "courseDescription": "...",
    "lessonTitle": "...",
    "lessonContent": "...",
    "lessonResources": [],
    "progressPercent": 50
  }
}
```

The adapter reads `AI_API_KEY` only from its server environment and calls `${AI_BASE_URL}/v1/chat/completions`. Its `/health` route can report degraded configuration while the container remains available. Live provider behavior is credential-dependent and must not be reported as verified when the key is absent.
