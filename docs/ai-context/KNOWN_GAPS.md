# Known Gaps

This document tracks known deviations between the current codebase and the authoritative architectural design.

## Architectural Gaps

1.  **Missing Revenue Report Endpoint:**
    *   No backend service contains reporting aggregations for course revenues.
2.  **Live AI provider credential:**
    *   Source integration is complete, but a real provider call cannot be verified until `AI_API_KEY` is supplied outside Git.

## Codebase and Test Gaps

1.  **Legacy Payment Test:**
    *   `tests/test-payment-flow.js` is retained as historical scaffolding. `tests/test-payment-course-flow.js` delegates to the active ZaloPay Sandbox focused test unless explicitly put in legacy mode.
2.  **Local callback reachability:**
    *   ZaloPay cannot normally call a localhost callback. The Web Client therefore polls the signed query endpoint; public callback deployment requires a reachable HTTPS URL.
