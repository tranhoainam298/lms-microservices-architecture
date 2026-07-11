# Agent Work Rules

Rules that AI agents must follow when modifying this codebase:

## Safety Constraints

*   **Work Only inside:** `D:\github tool\lms-microservices-architecture`. Never access, read, or modify files outside this directory.
*   **Git Root Check:** Run `git rev-parse --show-toplevel` and `git status --short --untracked-files=all` before modifying files.
*   **Forbidden Commands:** Never run `git reset`, `git clean`, `git restore`, `git checkout .`, `git checkout --`, `git stash`, `rm -rf`, `Remove-Item -Recurse`, `rmdir /s`, or `del /s`.
*   **No Deletion:** Never delete, move, or rename existing user files.
*   **No Speculative Dependencies:** Do not run `npm install` unless a declared dependency is missing.

## Database Rules

*   **Database-Per-Service:** Services must connect only to their own database. No direct database access or cross-joining across services.
*   **Do Not Create:** Reporting DB, Chatbot DB, Learning Result DB, Notification DB, or Enrollment DB.

## Service Rules

*   **Do Not Create:** Reporting Service, Chatbot Service, Analytics Service, Notification Service, or Enrollment Service.
