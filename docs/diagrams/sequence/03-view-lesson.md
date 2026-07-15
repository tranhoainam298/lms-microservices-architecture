# Sequence 3 — View Lesson and Persist Progress

**Learning outline endpoint:** `GET /api/courses/:courseId/learning`

**Lesson endpoint:** `GET /api/courses/lessons/:lessonId`

**Completion endpoint:** `POST /api/courses/lessons/:lessonId/complete`

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Web as Web Client
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant CourseDB as Course DB

    Student->>Web: Open an enrolled course lesson
    Web->>Gateway: GET /api/courses/lessons/:lessonId + JWT
    Gateway->>Gateway: Verify JWT and student role
    Gateway->>CourseSvc: GET /courses/lessons/:lessonId + original JWT
    CourseSvc->>CourseSvc: Verify JWT; derive studentId
    CourseSvc->>CourseDB: Query lesson joined to published course
    CourseDB-->>CourseSvc: Lesson, courseId, video/document metadata
    CourseSvc->>CourseDB: Query active enrollment by JWT studentId + courseId

    alt Course is not published or active enrollment is absent
        CourseSvc-->>Gateway: 403 COURSE_ACCESS_REQUIRED
        Gateway-->>Web: 403 locked response
        Web-->>Student: Enroll to unlock this lesson
    else Access is allowed
        CourseSvc-->>Gateway: 200 lesson content/resources
        Gateway-->>Web: 200 lesson content/resources
        Web-->>Student: Render video, document, and lesson navigation

        Student->>Web: Mark lesson as completed
        Web->>Gateway: POST /api/courses/lessons/:lessonId/complete + JWT
        Gateway->>CourseSvc: POST /courses/lessons/:lessonId/complete + JWT
        CourseSvc->>CourseDB: BEGIN transaction and recheck published course + active enrollment
        CourseSvc->>CourseDB: INSERT lesson_progress completed<br/>ON DUPLICATE KEY UPDATE idempotently
        CourseSvc->>CourseDB: Count course lessons and completed lessons
        CourseSvc->>CourseDB: UPDATE enrollments.progress_percent
        CourseSvc->>CourseDB: COMMIT
        CourseSvc-->>Gateway: 200 completedLessonIds + progress
        Gateway-->>Web: 200 updated progress
        Web-->>Student: Refresh progress and continue learning
    end
```

The completion request carries no trusted `studentId`. The unique student/course/lesson rule makes repeat completion idempotent, and the course percentage is recalculated in Course DB within the same transaction.
