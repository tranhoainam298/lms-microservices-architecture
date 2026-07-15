# Known Gaps

This document tracks known deviations between the current codebase and the authoritative architectural design.

## Architectural Gaps

1.  **Live ZaloPay Sandbox credentials:**
    *   Source integration is complete, but live provider create/query remains blocked until `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, and `ZALOPAY_KEY2` are configured outside Git.
2.  **Live AI provider credential:**
    *   Source integration is complete, but a real provider call cannot be verified until `AI_API_KEY` is supplied outside Git.

## Codebase and Test Gaps

1.  **Legacy Payment Test:**
    *   `tests/test-payment-flow.js` is retained as historical scaffolding. `tests/test-payment-course-flow.js` delegates to the active ZaloPay Sandbox focused test unless explicitly put in legacy mode.
2.  **Local callback reachability:**
    *   ZaloPay cannot normally call a localhost callback. The Web Client therefore polls the signed query endpoint; public callback deployment requires a reachable HTTPS URL.
3.  **Fresh Exam volume runtime check:**
    *   `infra/mysql-init/init-exam-db.sql` is statically aligned with the active EF Core entities and additive migrator. A destructive fresh-volume run was intentionally not performed, so existing Docker data remained untouched.
4.  **Optional role logins in the compatibility smoke suite:**
    *   `tests/e2e-full-test.ps1` now checks only current non-destructive routes by default. Student, instructor, and admin login checks run when their `LMS_E2E_*_EMAIL` and `LMS_E2E_*_PASSWORD` environment variables are supplied.
