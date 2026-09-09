# Lab 3 REST API Contract

Authoritative for request and response payloads, validation rules, status codes,
and error envelopes. Behavior rules are numbered in [`specification.md`](./specification.md)
as BR-nn.

---

## Conventions

All paths are relative to `/api` and reach Express through the Vite development proxy
(ADR-0002). All request and response bodies are JSON, with the exception of attachment
upload (multipart form data) and attachment download (binary stream).

### Authentication and Session Transport

In Lab 3, the temporary `X-Requester-Id` header is completely retired. Authentication
relies on signed session tokens transported via an `httpOnly`, `SameSite=Lax`, `Path=/`
cookie named `toktickit_session` (ADR-0007).

To simplify automated API testing with Supertest, the backend also inspects the
`Authorization: Bearer <token>` header if the cookie is not present.

The authentication middleware resolves the caller's identity into `req.user`:

```typescript
interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  isActive: boolean;
  mustChangePassword: boolean;
}
```

### Authorization Gates

1. **Unauthenticated Access**: Requests to protected routes without a valid session
   cookie or Bearer token answer `401 Unauthorized` with code `UNAUTHENTICATED`.
2. **Deactivated Accounts**: Requests from a user whose account is deactivated
   (`isActive: false`) answer `401 Unauthorized` with code `ACCOUNT_INACTIVE` (BR-10).
3. **Mandatory Password Change Gate**: If `req.user.mustChangePassword === true`,
   any request to a route other than `/api/auth/change-password`, `/api/auth/me`, or
   `/api/auth/logout` is rejected with `403 Forbidden` and code `PASSWORD_CHANGE_REQUIRED` (BR-02).
4. **Role Segregation**: Requests to a route prohibited for the caller's role answer
   `403 Forbidden` with code `FORBIDDEN` (BR-14, BR-15, ADR-0008).
5. **Ownership Protection**: When a Requester accesses a Ticket or Attachment they do
   not own, the API responds with `404 Not Found` and code `TICKET_NOT_FOUND` or
   `ATTACHMENT_NOT_FOUND` to prevent resource enumeration (BR-16, ADR-0005).

### Error Envelope

Every failure across all endpoints conforms to:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "fields": {
      "email": "A valid email address is required."
    }
  }
}
```

- `code`: Machine-readable string identifying the error condition.
- `message`: Human-readable, safe message suitable for presentation.
- `fields`: Optional key-value map detailing field-specific validation failures.
- No response ever includes stack traces, SQL, Prisma errors, or file paths (BR-43).

### Status Codes

| Status | Usage |
| --- | --- |
| 200 | Successful read, update, or soft-removal. |
| 201 | Resource created (returns created entity and `Location` header where appropriate). |
| 400 | Validation error, malformed parameter, or business rule violation. |
| 401 | Missing, expired, or invalid credentials; deactivated user account. |
| 403 | Forbidden: caller's role lacks permission, or password change required. |
| 404 | Resource missing, or resource not owned by the requesting Requester. |
| 409 | Conflict: duplicate email address or concurrent state conflict. |
| 413 | Uploaded payload or file exceeds size limit (5 MB). |
| 415 | Unsupported file media type. |
| 500 | Unexpected internal server failure (generic message only). |

---

## 1. Authentication Endpoints

### POST /api/auth/login

Authenticates a user with email and password.

#### Request

```json
{
  "email": "michael.brown@toktickit.com",
  "password": "Password123!"
}
```

#### Responses

- **200 OK**: Credentials valid. Sets `toktickit_session` cookie.

```json
{
  "user": {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@toktickit.com",
    "role": "IT_STAFF",
    "mustChangePassword": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

- **401 Unauthorized**:
  - Invalid email or password: `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password." } }`
  - Inactive account: `{ "error": { "code": "ACCOUNT_INACTIVE", "message": "Account is deactivated. Please contact an administrator." } }`
- **400 Bad Request**: Validation failure (missing email or password).

---

### POST /api/auth/logout

Invalidates the current session and clears the cookie.

**Request**: No body required.

#### Responses

- **200 OK**: Clears cookie with `Max-Age=0`.

```json
{
  "message": "Logged out successfully."
}
```

---

### GET /api/auth/me

Returns the profile of the currently authenticated user.

#### Responses

- **200 OK**:

```json
{
  "user": {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@toktickit.com",
    "role": "IT_STAFF",
    "mustChangePassword": false
  }
}
```

- **401 Unauthorized**: Unauthenticated request.

---

### POST /api/auth/change-password

Enables users to change their password. Required for users with `mustChangePassword === true`.

#### Request

```json
{
  "currentPassword": "Password123!",
  "newPassword": "SecurePassword456!",
  "confirmPassword": "SecurePassword456!"
}
```

#### Validation

- `currentPassword`: Required. Must match stored password.
- `newPassword`: Required, minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character.
- `confirmPassword`: Must match `newPassword`.
- `newPassword` cannot be identical to `currentPassword`.

#### Responses

- **200 OK**: Password updated. Sets `mustChangePassword: false`. Returns updated user profile.

```json
{
  "user": {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@toktickit.com",
    "role": "IT_STAFF",
    "mustChangePassword": false
  },
  "message": "Password changed successfully."
}
```

- **400 Bad Request**: Validation failure, mismatched confirmation, or identical to current password.
- **401 Unauthorized**: Current password incorrect.

---

## 2. Requester Ticket Endpoints

All endpoints require role `REQUESTER`.

### GET /api/tickets

Lists tickets owned by the authenticated Requester.

#### Query Parameters

- `search`: Substring search in `ticketNumber` or `summary`.
- `category`: Category ID (integer).
- `priority`: Requested Priority (`LOW`, `MEDIUM`, `HIGH`).
- `status`: Ticket Status (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
- `sortBy`: `createdAt`, `ticketNumber`, `updatedAt` (default: `createdAt`).
- `sortOrder`: `asc` or `desc` (default: `desc`).
- `page`: 1-based page number (default: 1).
- `pageSize`: `10`, `20`, or `50` (default: 10).

#### Responses

- **200 OK**:

```json
{
  "items": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains quickly",
      "categoryId": 2,
      "categoryName": "Hardware",
      "relatedSystemId": 6,
      "relatedSystemName": "Corporate Laptop",
      "requestedPriority": "MEDIUM",
      "status": "OPEN",
      "resolvedByRequester": false,
      "createdAt": "2026-09-10T08:15:00.000Z",
      "updatedAt": "2026-09-10T09:30:00.000Z",
      "activeAttachmentCount": 1
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

### POST /api/tickets

Creates a new Ticket owned by the authenticated Requester.

#### Request

```json
{
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining fast even in sleep mode.",
  "categoryId": 2,
  "relatedSystemId": 6,
  "requestedPriority": "MEDIUM"
}
```

*Note: Any `requesterId` in the body is rejected with 400 `REQUESTER_ID_IN_BODY`.*

#### Responses

- **201 Created**:

```json
{
  "ticket": {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery is draining fast even in sleep mode.",
    "categoryId": 2,
    "relatedSystemId": 6,
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "status": "NEW",
    "requesterId": 1,
    "createdAt": "2026-09-10T08:15:00.000Z"
  }
}
```

---

### GET /api/tickets/:id

Retrieves one owned Ticket's detail.

#### Responses

- **200 OK**: Returns full ticket detail.
- **404 Not Found**: Ticket does not exist OR caller is not the owning Requester (ADR-0005).

---

### POST /api/tickets/:id/resolve-indication

Allows the owning Requester to indicate that the problem appears resolved (BR-05, BR-24).

#### Responses

- **200 OK**:

```json
{
  "id": 12,
  "resolvedByRequester": true,
  "message": "Problem indicated as resolved. IT Staff will review and formally close the ticket."
}
```

- **404 Not Found**: If ticket does not exist or caller is not owner.

---

## 3. IT Staff Ticket Queue & Operations

Requires role `IT_STAFF` or `ADMINISTRATOR`. Requesters receive `403 Forbidden`.

### GET /api/staff/tickets

Lists all tickets in the system with queue filtering and search.

#### Query Parameters

- `search`: Substring search in `ticketNumber` or `summary`.
- `category`: Category ID.
- `status`: Ticket status filter.
- `priority`: Filter by `itPriority`.
- `owner`: Filter by `ticketOwnerId` (or special values: `unassigned`, `me`).
- `sortBy`: `createdAt`, `ticketNumber`, `itPriority`, `status`, `updatedAt` (default: `createdAt`).
- `sortOrder`: `asc` or `desc` (default: `desc`).
- `page`: 1-based page number (default: 1).
- `pageSize`: `10`, `20`, `50` (default: 10).

#### Responses

- **200 OK**:

```json
{
  "items": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains quickly",
      "categoryName": "Hardware",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "status": "IN_PROGRESS",
      "ticketOwner": {
        "id": 2,
        "name": "Michael Brown"
      },
      "requester": {
        "id": 1,
        "name": "Jennifer Anderson"
      },
      "resolvedByRequester": false,
      "createdAt": "2026-09-10T08:15:00.000Z",
      "updatedAt": "2026-09-10T09:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 87,
    "totalPages": 9
  }
}
```

---

### GET /api/staff/tickets/:id

Retrieves complete Ticket detail for operational management.

#### Responses

- **200 OK**:

```json
{
  "id": 12,
  "ticketNumber": "TKT-2026-000012",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining fast even in sleep mode.",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 6, "name": "Corporate Laptop" },
  "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.ac.th" },
  "ticketOwner": { "id": 2, "name": "Michael Brown" },
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "status": "IN_PROGRESS",
  "resolvedByRequester": false,
  "createdAt": "2026-09-10T08:15:00.000Z",
  "updatedAt": "2026-09-10T09:30:00.000Z",
  "attachments": [],
  "publicCommentsCount": 3,
  "internalNotesCount": 2
}
```

- **404 Not Found**: Ticket not found.

---

### PATCH /api/staff/tickets/:id/owner

Claims or reassigns primary Ticket Owner.

#### Request

```json
{
  "ownerId": 2
}
```

*Pass `null` to unassign, or pass an active IT Staff / Administrator ID.*

#### Responses

- **200 OK**:

```json
{
  "ticketId": 12,
  "ticketOwnerId": 2,
  "status": "OPEN",
  "message": "Ticket ownership updated."
}
```

- **400 Bad Request**: Specified user is inactive or not an IT Staff / Administrator.

---

### PATCH /api/staff/tickets/:id/priority

Updates IT Priority.

#### Request

```json
{
  "itPriority": "HIGH"
}
```

#### Responses

- **200 OK**:

```json
{
  "ticketId": 12,
  "itPriority": "HIGH",
  "message": "IT Priority updated."
}
```

- **400 Bad Request**: Invalid priority value.

---

### PATCH /api/staff/tickets/:id/status

Executes a validated status transition.

#### Request

```json
{
  "status": "RESOLVED"
}
```

#### Responses

- **200 OK**:

```json
{
  "ticketId": 12,
  "status": "RESOLVED",
  "message": "Status updated successfully."
}
```

- **400 Bad Request**: Invalid status transition (e.g. `NEW` to `RESOLVED` directly violates BR-22).

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition status from NEW directly to RESOLVED."
  }
}
```

---

## 4. Public Comments & Internal Notes

### GET /api/tickets/:id/comments

Retrieves public comments for a ticket. Accessible to the owning Requester, IT Staff, and Administrator.

#### Responses

- **200 OK**:

```json
[
  {
    "id": 1,
    "content": "We have ordered a replacement battery for your device.",
    "createdAt": "2026-09-10T10:00:00.000Z",
    "author": {
      "id": 2,
      "name": "Michael Brown",
      "role": "IT_STAFF"
    }
  }
]
```

---

### POST /api/tickets/:id/comments

Posts a new public comment. Accessible to owning Requester, IT Staff, and Administrator.

#### Request

```json
{
  "content": "Thank you for the update. When can I expect it to arrive?"
}
```

**Validation**: `content` trimmed, 1 to 2,000 characters.

#### Responses

- **201 Created**: Returns created comment with author metadata.
- **400 Bad Request**: Empty or whitespace-only content.
- **404 Not Found**: Ticket not found or Requester does not own ticket.

---

### GET /api/tickets/:id/notes

Retrieves internal notes. Strictly restricted to `IT_STAFF` and `ADMINISTRATOR`.

#### Responses

- **200 OK**: Returns array of internal note objects.
- **403 Forbidden**: Caller is a Requester (`FORBIDDEN` error).

---

### POST /api/tickets/:id/notes

Posts an internal note. Strictly restricted to `IT_STAFF` and `ADMINISTRATOR`.

#### Request

```json
{
  "content": "Battery SKU 4820-A requested from Dell inventory."
}
```

#### Responses

- **201 Created**: Returns created note object.
- **403 Forbidden**: Caller is a Requester.

---

## 5. Administrator User Management

All endpoints require role `ADMINISTRATOR`. Non-administrators receive `403 Forbidden`.

### GET /api/admin/users

Lists user accounts with search and role filter.

#### Query Parameters

- `search`: Substring search in user `name` or `email`.
- `role`: Filter by role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).

#### Responses

- **200 OK**:

```json
[
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.ac.th",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-09-01T00:00:00.000Z"
  }
]
```

---

### POST /api/admin/users

Creates a new user with an initial password.

#### Request

```json
{
  "name": "Alex Thompson",
  "email": "alex.thompson@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPass123!"
}
```

#### Validation

- `name`: Required, 2 to 100 characters.
- `email`: Required, valid email format, unique across all users.
- `role`: One of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- `initialPassword`: Required, minimum 8 characters.

#### Responses

- **201 Created**: User created with `mustChangePassword: true`.

```json
{
  "user": {
    "id": 15,
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": true
  }
}
```

- **409 Conflict**: Email already in use (`DUPLICATE_EMAIL`).

---

### PATCH /api/admin/users/:id

Edits an existing user's basic information and active state.

#### Request

```json
{
  "name": "Alex Thompson Jr.",
  "role": "IT_STAFF",
  "isActive": false
}
```

#### Safety Rules Enforced

- Self-deactivation: An Administrator cannot set `isActive: false` on their own user ID (BR-29) -> `400 Bad Request` with code `CANNOT_DEACTIVATE_SELF`.
- Last Administrator protection: Deactivating or reassigning the role of the system's last active Administrator is rejected (BR-30) -> `400 Bad Request` with code `CANNOT_DEACTIVATE_LAST_ADMIN`.

#### Responses

- **200 OK**: Returns updated user profile.
- **400 Bad Request**: Safety rule violation or invalid data.
- **409 Conflict**: Email conflict if updating email.

---

### POST /api/admin/users/:id/reset-password

Assigns a new initial password to an existing user.

#### Request

```json
{
  "initialPassword": "TempPassword789!"
}
```

#### Responses

- **200 OK**:

```json
{
  "message": "Initial password updated. User will be required to change password at next login."
}
```

- **400 Bad Request**: Password fails minimum length requirement.
- **404 Not Found**: User ID not found.
