# AD02 - API Gateway

## Status
Accepted

## Context
Web and future mobile clients require one stable API entry point. Direct browser access to individual services would expose internal topology and produce inconsistent routing and authentication behavior.

## Decision
Route browser API traffic through Nginx `/api` to the API Gateway. The Gateway forwards requests to User, Course, Exam, or Payment Service using service URLs and preserves authorization, method, body, and downstream status. Business authorization remains enforced by each owning service.

## Consequences
- Clients do not need internal service addresses and must not call service/database/provider endpoints directly.
- The Gateway centralizes routing and cross-cutting HTTP concerns but does not calculate grades, payments, enrollments, reports, or access databases.
- Gateway availability and route configuration become shared operational concerns; health checks and contract tests are required.
