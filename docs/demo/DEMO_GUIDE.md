# LMS 10-Minute Demo Guide

## Prepare once

1. Double-click `start-lms.bat` and wait for the public health check to pass.
2. Double-click `seed-demo-data.bat`.
3. Open `http://localhost:8080`.

The explicit seeder is safe to run again. It first checks every deterministic ID/natural-key pair across all four databases without writing. If a shared volume contains a conflicting identity, the entire run stops before applying seed SQL; it never overwrites the unrelated row. Otherwise it upserts only the known demo records and does not remove existing data.

For a brand-new volume, the local Docker Compose file mounts the same seed sources after each database schema initializer. That happens once during local first-volume initialization. Normal startup does not repeatedly seed existing volumes. A production-like deployment must omit the local `zz-demo-seed.sql` mounts and must not run the explicit demo command.

## Minute 0-2: Admin workspace

1. Sign in as `admin@lms.demo` using the demo credentials in `DEMO_ACCOUNTS.md`.
2. Open the dashboard and confirm users, courses, payments, and revenue show non-zero data.
3. Open User management and filter by role or inactive status.
4. Open the activity report to see successful and failed logins over multiple dates.
5. Open the revenue report and review totals, course breakdown, and transaction history.

If demonstrating a status change, use a non-primary demo account and restore it before finishing. Do not alter the primary admin, instructor, or student account.

## Minute 2-5: Instructor workspace

1. Sign in as `instructor1@lms.demo`.
2. Review My Courses: two published courses contain students and one draft is ready to edit.
3. Open draft course `20010` (Advanced TypeScript Patterns).
4. Update a safe descriptive field and save it.
5. Add a temporary lesson, edit it, then delete that exact temporary lesson.
6. Use quiz management for an owned draft to demonstrate quiz/question authoring where the current UI exposes it.
7. Open student progress and quiz result summaries for an owned published course.

Course ownership and draft-only deletion are enforced by the backend. No UI action should claim success without an API response.

## Minute 5-9: Student learning flow

1. Sign in as `student1@lms.demo`.
2. Search the catalog for `Python`, then filter by category or free/paid state.
3. Open My Learning. Python, React and Node, and MySQL should show different progress values.
4. Open Python Foundations and complete the first lesson. Progress should persist and become 20% after refresh.
5. Navigate between lessons and open the supplied resource card.
6. Open the MySQL quiz (`30003`), submit answers, and review the server-calculated result.
7. Open Quiz Results to confirm the new result appears with the historical results.

The student identity comes from the JWT. Lesson completion and quiz grading are persisted by their owning services; the browser does not choose a student ID or score.

## Minute 9-10: External integrations and boundaries

- Payment history and revenue are immediately demonstrable from `demo_seed` records. A new real checkout still uses ZaloPay Sandbox and requires local sandbox credentials.
- AI support appears only in an unlocked lesson. A live answer requires a locally configured `AI_API_KEY`; without it the backend returns the documented configuration error and never fabricates an answer.
- RabbitMQ management is available at `http://localhost:15672` when using the local defaults. Do not expose this management port in a production-like deployment.

## Expected local data floor

The deterministic dataset alone contributes:

- 27 users and 81 login-audit rows
- 12 courses, 60 lessons, 40 enrollments, and 96 lesson completions
- 8 quizzes, 40 questions, and 24 results
- 36 payment transactions with successful, pending, and failed states

The seeder summary may be higher because it preserves all existing user-created and test data.
