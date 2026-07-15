# Sequence 7 — Ask a Learning Question

**Public endpoint:** `POST /api/courses/lessons/:lessonId/ai/ask`

**Gateway/service endpoint:** `POST /courses/lessons/:lessonId/ai/ask`

**External adapter endpoint:** `POST /chat`

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant LessonUI as Lesson UI
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant CourseDB as Course DB
    participant AI as External AI Chatbot System

    Student->>LessonUI: Ask a question about the current lesson
    LessonUI->>Gateway: POST /api/courses/lessons/:lessonId/ai/ask<br/>{question} + JWT
    Gateway->>Gateway: Verify JWT, student role, lessonId, and request body
    Gateway->>CourseSvc: POST /courses/lessons/:lessonId/ai/ask + JWT
    CourseSvc->>CourseSvc: Verify JWT; derive studentId;<br/>trim and validate 1..1000 character question
    CourseSvc->>CourseDB: Query lesson, parent course, active enrollment,<br/>resources, and progress percentage
    CourseDB-->>CourseSvc: Course/lesson context and access state

    alt Lesson missing
        CourseSvc-->>Gateway: 404 LESSON_NOT_FOUND
        Gateway-->>LessonUI: 404 safe error
    else Course unpublished or student not actively enrolled
        CourseSvc-->>Gateway: 403 COURSE_ACCESS_REQUIRED
        Gateway-->>LessonUI: 403 locked AI support
    else Access allowed
        CourseSvc->>AI: POST /chat<br/>{question, course/lesson/resource/progress context}
        alt Provider key is not configured
            AI-->>CourseSvc: 503 AI_PROVIDER_NOT_CONFIGURED
            CourseSvc-->>Gateway: 503 configuration-safe error
            Gateway-->>LessonUI: AI support is not configured
        else Provider or network unavailable
            AI-->>CourseSvc: 502 AI_PROVIDER_UNAVAILABLE
            CourseSvc-->>Gateway: 502 safe unavailable error
            Gateway-->>LessonUI: Try again later
        else Provider returns invalid response
            AI-->>CourseSvc: 502 AI_PROVIDER_RESPONSE_INVALID
            CourseSvc-->>Gateway: 502 safe invalid-response error
            Gateway-->>LessonUI: Try again later
        else Real provider returns an answer
            AI-->>CourseSvc: 200 answer + model/provider + token usage metadata
            CourseSvc->>CourseSvc: Validate non-empty answer and normalize response
            CourseSvc-->>Gateway: 200 safe AI answer
            Gateway-->>LessonUI: 200 AI answer
            LessonUI-->>Student: Display answer inside unlocked lesson
        end
    end
```

Course Service is the context owner and uses Course DB only. The external adapter alone reads `AI_API_KEY`; JWTs, passwords, payment data, database credentials, and internal service secrets are never sent in the AI prompt. There is no canned fallback. Live provider verification is credential-dependent.
