# AD05 - External Services

## Status
Accepted

## Context
Payment processing and generative learning assistance require capabilities and credentials outside the LMS core. Embedding provider calls in the browser or allowing external systems to access LMS databases would expose secrets and bypass business authorization.

## Decision
Treat ZaloPay/Momo and the AI Chatbot System as external systems. Payment Service owns provider signing, callback/query verification, payment status, and the request for Course Service access activation. Course Service validates lesson access, loads Course DB context, and calls the external AI adapter; only the adapter receives the AI provider key. The executable payment provider is documented according to actual support (currently ZaloPay Sandbox); Momo remains an architectural alternative unless separately implemented and verified.

## Consequences
- Provider keys remain server-side and are never committed, returned to clients, or included in events.
- Live verification depends on locally configured sandbox/AI credentials; missing credentials produce explicit safe errors rather than mock success or canned answers.
- Provider outages do not grant access or fabricate AI output, and unrelated LMS learning functions continue where possible.
- Provider adapters and contracts isolate vendor-specific formats while Payment and Course services retain authoritative business rules and database ownership.
