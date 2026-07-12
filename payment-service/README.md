# Payment Service

- Owns Payment DB
- Handles pending payments, payment status, ZaloPay/Momo integration, and revenue data
- Must request Course Service to activate course access after successful payment

## ZaloPay Sandbox payment flow

- `POST /payments/checkout` requires a student JWT and accepts only `courseId` plus an optional `paymentMethod`.
- Course price and published status come from Course Service through an authenticated internal request.
- Checkout converts the demo course price to VND, signs the ZaloPay Sandbox v2 create request with Key1, and returns `order_url`.
- `GET /payments/check-status/:appTransId` queries ZaloPay Sandbox and activates enrollment only after paid confirmation.
- `POST /payments/callback/zalopay` verifies callback MAC with Key2 before changing Payment DB state.
- `GET /payments/:paymentId` returns only the authenticated student's payment.
- Mock completion and the legacy body-trusting webhook return `410 ENDPOINT_DEPRECATED`.

Only sandbox endpoints and sandbox credentials are accepted. Keys must be supplied through environment variables and are never returned to the browser.
