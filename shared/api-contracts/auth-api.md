# Auth API Contract

## POST /auth/login

**Entry point:** API Gateway
**Owner service:** User Service
**Database:** User DB

### Description

Authenticates a user with email and password credentials. Returns an access token and user profile on success.

### Request

```
POST /auth/login
Content-Type: application/json
```

| Field | Type | Required | Description |
|---|---|---|---|
| email | string | Yes | User's registered email address |
| password | string | Yes | User's password |

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| accessToken | string | JWT access token for authenticated requests |
| userProfile | object | User profile information (id, name, email, avatar) |
| role | string | User's role (student, instructor, admin) |

### Error Responses

| Status | Code | Description |
|---|---|---|
| 401 | INVALID_LOGIN | Email or password is incorrect |
| 403 | ACCOUNT_LOCKED | Account has been locked due to policy violation or too many failed attempts |

### Related Sequence Diagram

**Sequence Diagram — Account Management: Login**

Flow:
1. Client sends login request to API Gateway
2. API Gateway forwards to User Service
3. User Service validates credentials against User DB
4. User Service generates JWT access token
5. User Service publishes `UserLoggedInEvent` to Message Broker
6. User Service returns accessToken, userProfile, and role to API Gateway
7. API Gateway returns response to Client
