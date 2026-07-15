# Sequence 2 — Save Draft Course

**Public endpoint:** `POST /api/courses/draft`

**Gateway/service endpoint:** `POST /courses/draft`

```mermaid
sequenceDiagram
    autonumber
    actor Instructor
    participant Web as Web Client
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant CourseDB as Course DB

    Instructor->>Web: Enter course and optional lesson draft data
    Web->>Gateway: POST /api/courses/draft + instructor JWT
    Note over Web,Gateway: Nginx removes /api
    Gateway->>Gateway: Verify JWT and instructor role

    alt Missing/invalid JWT or wrong role
        Gateway-->>Web: 401/403
        Web-->>Instructor: Show authorization error
    else Authorized instructor
        Gateway->>CourseSvc: POST /courses/draft + original JWT
        CourseSvc->>CourseSvc: Verify JWT; derive instructorId<br/>validate title, description, price, URLs, lesson order
        alt Validation fails
            CourseSvc-->>Gateway: 400 VALIDATION_ERROR
            Gateway-->>Web: 400 validation details
            Web-->>Instructor: Keep form data and show errors
        else Valid draft
            CourseSvc->>CourseDB: BEGIN transaction
            CourseSvc->>CourseDB: INSERT course with status=draft and instructor_id
            opt Initial lessons supplied
                CourseSvc->>CourseDB: INSERT validated lessons with server-checked order
            end
            CourseSvc->>CourseDB: COMMIT
            CourseDB-->>CourseSvc: Persisted course and lesson identifiers
            CourseSvc-->>Gateway: 201 course draft
            Gateway-->>Web: 201 course draft
            Web-->>Instructor: Show saved draft
        end
    end
```

Instructor identity is derived from the verified JWT. Course Service owns all draft and lesson writes; API Gateway and Web Client do not send a trusted `instructorId`.
