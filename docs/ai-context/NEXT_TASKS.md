# Next Tasks

A backlog of outstanding tasks to achieve full architectural alignment:

1.  **Refactor Test Cross-Service Database Access:**
    *   Retire the historical `tests/test-payment-flow.js` scaffolding after downstream documentation no longer references it.
2.  **Validate the real AI provider:**
    *   Supply `AI_API_KEY` outside Git and run one enrolled lesson question through the live provider endpoint.
3.  **Close Deployment Portability Gaps:**
    *   Add an approved, additive Exam DB base-schema migration for completely fresh volumes.
    *   Define production backup scheduling and retention requirements; the current `backup` profile is manual and local-only.
6.  **Validate ZaloPay Sandbox With Project Credentials:**
    *   Supply `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, and `ZALOPAY_KEY2` outside Git, run create-order against Sandbox, and manually complete one sandbox order to verify polling and enrollment activation.
