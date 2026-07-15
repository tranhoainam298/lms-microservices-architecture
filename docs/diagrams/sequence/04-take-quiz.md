# Sequence 4 — Take Quiz

**Load endpoint:** `GET /api/exams/quizzes/:quizId`

**Submit endpoint:** `POST /api/exams/quizzes/:quizId/submit`

**Access dependency:** `GET /courses/:courseId/student-exam-access`

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Web as Web Client
    participant Gateway as API Gateway
    participant ExamSvc as Exam & Quiz Service
    participant CourseSvc as Course Service
    participant ExamDB as Exam DB

    Student->>Web: Open a published quiz
    Web->>Gateway: GET /api/exams/quizzes/:quizId + JWT
    Gateway->>Gateway: Verify JWT and student role
    Gateway->>ExamSvc: GET /exams/quizzes/:quizId + original JWT
    ExamSvc->>ExamDB: Load published quiz and real courseId
    ExamDB-->>ExamSvc: Quiz metadata + questions + internal answer keys
    ExamSvc->>CourseSvc: GET /courses/:courseId/student-exam-access<br/>forward original student JWT
    CourseSvc->>CourseSvc: Verify JWT; derive studentId
    CourseSvc->>CourseSvc: Check published course and active enrollment in Course DB
    CourseSvc-->>ExamSvc: 200 allowed or 403 COURSE_ACCESS_REQUIRED

    alt Course access denied
        ExamSvc-->>Gateway: 403 COURSE_ACCESS_REQUIRED
        Gateway-->>Web: 403 locked response
        Web-->>Student: Show enrollment requirement
    else Course access allowed
        ExamSvc-->>Gateway: 200 quiz questions without correct answers
        Gateway-->>Web: 200 safe quiz payload
        Web-->>Student: Display questions and options

        Student->>Web: Select options and submit
        Web->>Gateway: POST /api/exams/quizzes/:quizId/submit<br/>{answers:[questionId, selectedOptionIndex]}
        Gateway->>ExamSvc: POST /exams/quizzes/:quizId/submit + JWT
        ExamSvc->>ExamDB: Load published quiz, questions, and answer key
        ExamSvc->>CourseSvc: GET /courses/:courseId/student-exam-access + JWT
        CourseSvc-->>ExamSvc: 200 allowed or 403

        alt Invalid/duplicate question IDs or option indices
            ExamSvc-->>Gateway: 400 VALIDATION_ERROR
            Gateway-->>Web: 400 safe validation error
        else Student already submitted this quiz
            ExamSvc->>ExamDB: Check unique student + quiz result
            ExamSvc-->>Gateway: 409 QUIZ_ALREADY_SUBMITTED
            Gateway-->>Web: 409 duplicate-submission message
        else Valid first submission
            ExamSvc->>ExamSvc: Grade selected options server-side
            ExamSvc->>ExamDB: INSERT score, maximumScore, percentage,<br/>passed, submitted answers, submittedAt
            ExamDB-->>ExamSvc: Persisted resultId
            ExamSvc-->>Gateway: 201 result without answer key
            Gateway-->>Web: 201 score/result
            Web-->>Student: Show score and pass result
        end
    end
```

Exam Service owns grading and Exam DB. Course Service is contacted only by HTTP for access authorization; Exam Service has no Course DB connection. Student quiz payloads never contain `correctOptionIndex` or an answer key.
