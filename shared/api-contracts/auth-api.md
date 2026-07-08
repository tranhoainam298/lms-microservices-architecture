# Auth API Contract

## POST /auth/login

**Entry point:** API Gateway
**Owner service:** User Service
**Current data source:** User Service mock user store

### Description

Authenticates a user with email, password, and selected role. Returns a mock access token and user profile on success. User DB will be owned by User Service later but is not connected in this step.

### Request

```
POST /auth/login
Content-Type: application/json
```

| Field | Type | Required | Description |
|---|---|---|---|
| email | string | Yes | User's registered email address |
| password | string | Yes | User's password |
| role | string | Yes | Selected role: `student`, `instructor`, or `admin` |

Example:

```json
{
  "email": "student@lms.edu",
  "password": "password123",
  "role": "student"
}
```

### Success Response (200 OK)

| Field | Type | Description |
|---|---|---|
| accessToken | string | Clearly identified mock access token |
| userProfile | object | User profile with `id`, `email`, `fullName`, and `role` |
| role | string | User's role (student, instructor, admin) |

Example:

```json
{
  "accessToken": "mock-token-1-1751960000000",
  "userProfile": {
    "id": 1,
    "email": "student@lms.edu",
    "fullName": "John Student",
    "role": "student"
  },
  "role": "student"
}
```

### Error Responses

| Status | Code | Description |
|---|---|---|
| 400 | MISSING_FIELDS | Email, password, or role is missing |
| 401 | INVALID_LOGIN | Email or password is incorrect |
| 403 | ROLE_MISMATCH | Selected role does not match the account |
| 403 | ACCOUNT_LOCKED | Account is locked |

### Related Sequence Diagram

**Sequence Diagram — Account Management: Login**

Flow:
1. Client sends login request to API Gateway
2. API Gateway forwards to User Service
3. User Service validates credentials and role against its mock user store
4. User Service creates a clearly identified mock access token
5. User Service returns accessToken, userProfile, and role to API Gateway
6. API Gateway returns the response unchanged to the Client
