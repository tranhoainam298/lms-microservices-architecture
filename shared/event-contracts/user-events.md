# User events

The active User Service contract is [UserLoggedInEvent](UserLoggedInEvent.md). It is emitted only after credentials are verified and a JWT has been created. Login remains successful if RabbitMQ is temporarily unavailable; the publication failure is logged without secrets.
