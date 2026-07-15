# Payment events

The active Payment Service contracts are:

- [PaymentSucceededEvent](PaymentSucceededEvent.md)
- [PaymentFailedEvent](PaymentFailedEvent.md)

A transition event is emitted only when the transaction changes from `pending`. Repeated provider callbacks or status queries do not publish another transition event. A failed payment never invokes course-access activation.

`payment.failed` represents an explicit provider outcome, not uncertainty. Payment Service emits it when ZaloPay explicitly rejects create-order (non-`1` `return_code`, including `2`, or a missing `order_url`) or query returns `return_code=2`. A create/query timeout, connection loss, or provider transport outage leaves the transaction `pending` and emits no failure event, so a later valid signed callback or query can recover the payment.

Checkout creation is serialized per JWT student/course with MySQL `GET_LOCK`; within that reservation, Payment Service rejects an existing `pending` or `success` row. This prevents concurrent checkout calls from producing duplicate active attempts before any transition event can be emitted.
