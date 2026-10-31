# Lab 4 REST API Contract

Authoritative for request and response payloads, validation rules, status codes,
and error envelopes. Behavior rules are numbered in [`specification.md`](./specification.md)
as BR-nn. Lab 3's contract remains binding for everything this document does not
change; this file lists only what Lab 4 adds or amends.

---

## Conventions

All paths are relative to `/api` and reach Express through the Vite development proxy
(ADR-0002). All request and response bodies are JSON.

### Authorization Matrix

| Operation | Requester (owner) | Requester (other) | IT Staff | Administrator |
| --- | --- | --- | --- | --- |
| Read own Ticket detail | ✅ | ❌ 404 | ✅ (staff/any) | ✅ (any) |
| Read Actions Taken | ✅ | ❌ 404 | ✅ | ✅ |
| Create / update Actions Taken | ❌ 403 | ❌ 403 | ✅ | ✅ |
| Change owner / IT Priority / status | ❌ 403 | ❌ 403 | ✅ | ✅ |
| Resolution indication | ✅ (advisory) | ❌ 404 | ❌ 403 | ❌ 403 |
| Requester dashboard | ✅ (own only) | ✅ (own only) | ❌ 403 | ❌ 403 |
| Staff dashboard | ❌ 403 | ❌ 403 | ✅ | ✅ (plus account counts) |
| User Management | ❌ 403 | ❌ 403 | ❌ 403 | ✅ |

Unknown/expired sessions answer `401 UNAUTHENTICATED` on every protected route.
Role mismatch answers `403 FORBIDDEN`. Ownership mismatch answers `404` with the
resource's `*_NOT_FOUND` code, never `403`, to avoid confirming existence.

`X-Requester-Id` supplies no identity in any environment, including tests (BR-30,
D-28). Without a valid session, header-only requests answer `401 UNAUTHENTICATED`,
including ticket creation and attachment content. With a valid session, the header
is ignored; it cannot impersonate another User or change the caller's role.

### Error Envelope

Lab 3's envelope remains mandatory:

```json
{
  "error": {
    "code": "STALE_UPDATE",
    "message": "This ticket changed since you loaded it. Reload and try again.",
    "fields": { "expectedVersion": "Expected version 4, current version is 5." }
  }
}
```

New failure codes introduced in Lab 4:

| Code | Status | Meaning |
| --- | --- | --- |
| `STALE_UPDATE` | 409 | `expectedVersion` does not match the Ticket's current version |
| `ACTION_TAKEN_NOT_FOUND` | 404 | The action does not exist or does not belong to the addressed Ticket |

All existing codes keep their status and meaning. No response exposes internals
(BR-28).

### Ticket Version (additive to every Ticket payload)

Every Ticket-shaped response now carries `version`, an integer starting at `0`:

```json
{ "id": 12, "ticketNumber": "TKT-2026-000012", "version": 4, "...": "..." }
```

### Status Codes

Existing table plus: `409` now covers both duplicate email and stale updates;
`404` now covers `ACTION_TAKEN_NOT_FOUND`.

---

## 1. Actions Taken

### GET /api/tickets/:id/actions

Lists Actions Taken for a Ticket in ascending Action Date/Time order (BR-07).

**Roles**: owning Requester, IT Staff, Administrator (BR-09).

#### Responses

- **200 OK**:

```json
[
  {
    "id": 31,
    "ticketId": 12,
    "description": "Replaced the battery with spare SKU 4820-A.",
    "result": "Device now holds charge for a full working day.",
    "performedBy": { "id": 2, "name": "Michael Brown", "role": "IT_STAFF" },
    "followUpRequired": true,
    "followUpNote": "Monitor charge behaviour for one week; reorder SKU 4820-A if stable.",
    "attachmentNotes": "Photos of the old battery label are in attachment 'battery-old.jpg'.",
    "createdAt": "2026-09-10T10:00:00.000Z",
    "updatedAt": "2026-09-10T10:00:00.000Z"
  }
]
```

- **404 TICKET_NOT_FOUND**: Ticket absent, or caller is a Requester who does not own
  it (ADR-0005).
- **403 FORBIDDEN**: Caller is authenticated but neither the owning Requester nor
  staff/admin.
- Empty Ticket: `200` with `[]`.

---

### POST /api/tickets/:id/actions

Records an Action Taken. Performed by is taken from the session (BR-03).

**Roles**: IT Staff, Administrator (BR-08).

#### Request

```json
{
  "description": "Replaced the battery with spare SKU 4820-A.",
  "result": "Device now holds charge for a full working day.",
  "followUpRequired": true,
  "followUpNote": "Monitor charge behaviour for one week.",
  "attachmentNotes": "Photos are in attachment 'battery-old.jpg'.",
  "expectedVersion": 4
}
```

#### Validation

- `description`: required, trimmed, 1–2,000 characters.
- `result`: required, trimmed, 1–2,000 characters.
- `followUpRequired`: optional boolean, default `false`.
- `followUpNote`: required (trimmed, 1–2,000) iff `followUpRequired` is true; must be
  absent, `null`, or `""` when false (BR-04).
- `attachmentNotes`: optional, trimmed, `""` normalizes to `null`, max 1,000.
- `expectedVersion`: required integer ≥ 0 (BR-12).
- `performedBy`, `performedById`, `createdAt`, `seedKey`: not accepted; presence answers
  `400 VALIDATION_FAILED` with the offending field named.

#### Responses

- **201 Created**:

```json
{
  "action": { "id": 31, "...": "..." },
  "ticketVersion": 5
}
```

- **400 VALIDATION_FAILED**: field errors as above.
- **403 FORBIDDEN**: Requester.
- **404 TICKET_NOT_FOUND**.
- **409 STALE_UPDATE**: `expectedVersion` mismatch; no row is created (BR-13).

---

### PATCH /api/tickets/:id/actions/:actionId

Updates an Action Taken in place (BR-03 immutability applies).

**Roles**: IT Staff, Administrator.

#### Request

```json
{
  "description": "Replaced the battery with spare SKU 4820-A.",
  "result": "Charge holds; battery health reported at 96%.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Battery health screenshot attached to the ticket.",
  "expectedVersion": 5
}
```

All five editable fields are accepted. Omitted optional fields keep their stored
value. Setting `followUpRequired` to `false` clears the stored `followUpNote`;
supplying a non-empty note in the same request while the flag is false is rejected
exactly as in POST (BR-04). Validation otherwise matches POST.
`performedBy`/`createdAt` are immutable and rejected if supplied.
`seedKey` is seed-only metadata; it is rejected on writes and omitted from every
Action Taken response.

#### Responses

- **200 OK**: `{ "action": { ... }, "ticketVersion": 6 }`
- **400 VALIDATION_FAILED**.
- **403 FORBIDDEN**.
- **404 ACTION_TAKEN_NOT_FOUND** when the action is absent or belongs to another
  Ticket.
- **409 STALE_UPDATE**.

---

## 2. Dashboards

Metrics are computed server-side (BR-21). "Recently" always means the five most
recent matching Tickets by `updatedAt` descending; no date window or time zone is
involved (BR-22). Every response is a plain object; an empty database yields zeros
and empty arrays, never an error (BR-24).

### GET /api/dashboard/requester

**Roles**: Requester only. Scoped to `req.user.id` as `requesterId` (BR-23).

#### Response — 200 OK

```json
{
  "openTickets": 3,
  "waitingForRequester": 1,
  "recentlyUpdated": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains quickly",
      "status": "IN_PROGRESS",
      "itPriority": "MEDIUM",
      "updatedAt": "2026-09-10T10:00:00.000Z"
    }
  ],
  "recentlyResolved": []
}
```

| Field | Calculation |
| --- | --- |
| `openTickets` | count of the caller's Tickets with status in `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` |
| `waitingForRequester` | count of the caller's Tickets with status `WAITING_FOR_REQUESTER` |
| `recentlyUpdated` | caller's five most recent Tickets by `updatedAt` desc |
| `recentlyResolved` | caller's five most recent Tickets with status in `RESOLVED`, `CLOSED`, by `updatedAt` desc |

Drill-down (client-built links, using the amended list parameters below):

- Open Tickets → `/tickets?statusGroup=open` — the same five-status set the metric counts.
- Waiting for You → `/tickets?status=WAITING_FOR_REQUESTER`.
- Recently Updated → `/tickets?sort=updatedAt&order=desc`.
- Recently Resolved → `/tickets?statusGroup=resolved&sort=updatedAt&order=desc` — the same two-status set in recent-update order.

The recent dashboard lists show at most five Tickets. Their list-page links open
the full matching collection with the same ordering, rather than limiting the
destination to five (AC-15).

- **403 FORBIDDEN**: IT Staff or Administrator.

---

### GET /api/dashboard/staff

**Roles**: IT Staff and Administrator (BR-20). Administrator responses add
`userCounts`.

#### Response — 200 OK (IT Staff)

```json
{
  "unassigned": 4,
  "ownedByMe": 7,
  "byStatus": {
    "NEW": 3, "OPEN": 2, "IN_PROGRESS": 5, "WAITING_FOR_REQUESTER": 1,
    "RESOLVED": 4, "CLOSED": 2, "REOPENED": 1, "CANCELLED": 1
  },
  "byPriority": { "LOW": 2, "MEDIUM": 6, "HIGH": 4, "CRITICAL": 1 },
  "recentlyUpdated": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains quickly",
      "status": "IN_PROGRESS",
      "itPriority": "HIGH",
      "owner": { "id": 2, "name": "Michael Brown" },
      "updatedAt": "2026-09-10T10:00:00.000Z"
    }
  ]
}
```

#### Response — Administrator adds:

```json
{
  "userCounts": {
    "total": 15,
    "active": 13,
    "inactive": 2,
    "byRole": { "REQUESTER": 9, "IT_STAFF": 5, "ADMINISTRATOR": 1 }
  }
}
```

| Field | Calculation |
| --- | --- |
| `unassigned` | count of Tickets with `ticketOwnerId = null` |
| `ownedByMe` | count of Tickets with `ticketOwnerId = req.user.id` |
| `byStatus` | count per one of the eight statuses, all keys always present |
| `byPriority` | count per IT Priority, all four keys always present |
| `recentlyUpdated` | five most recent Tickets by `updatedAt` desc |
| `userCounts` | only for Administrators: totals, active/inactive, and by role |

Drill-down:

- Unassigned → `/staff/queue?owner=unassigned`
- Owned by Me → `/staff/queue?owner=me`
- Status → `/staff/queue?status=<STATUS>`
- Priority → `/staff/queue?priority=<PRIORITY>`
- Recently Updated → `/staff/queue?sortBy=updatedAt&sortOrder=desc`
- Total user count (Admin) → `/admin/users`.
- Per-role user counts (Admin) → `/admin/users?role=<ROLE>`.
- Active/inactive user counts are informational text, with no drill-down; the
  existing User Management API has no activation-state filter.

- **403 FORBIDDEN**: Requester.
- `userCounts` is omitted, not null, for IT Staff.

---

## 3. Amended Ticket Endpoints

The following existing endpoints change only by adding fields, requiring
`expectedVersion`, or accepting one new optional query parameter. Everything not
mentioned is unchanged.

### Amended list query parameter: `statusGroup`

`GET /api/tickets` accepts an optional `statusGroup`:

| Value | Meaning | Equivalent status filter |
| --- | --- | --- |
| `open` | Tickets still being worked | `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` |
| `resolved` | Finished positively | `RESOLVED`, `CLOSED` |

Only the exact values `open` and `resolved` are accepted; other values (including
empty or repeated values) answer `400 INVALID_QUERY_PARAMETER`. `statusGroup` and
`status` are mutually exclusive; supplying both answers
`400 INVALID_QUERY_PARAMETER` (API-19). The parameter exists so a Requester
dashboard card's drill-down returns exactly the set its metric counted (BR-25). The IT Staff queue
needs no equivalent: its cards drill by a single status, owner, or priority, all of
which it already filters.

Requester sorting retains the existing `sort=createdAt|ticketNumber|updatedAt`
and `order=asc|desc` parameters (defaults `createdAt`, `desc`); it does not accept
`sortBy`/`sortOrder`. Staff queue sorting retains `sortBy`/`sortOrder`.

Issue 27 updates `client/src/pages/MyTickets.tsx` to read and forward `statusGroup`
to `/api/tickets` alongside `sort`/`order`, retain it during pagination, and clear
it when a single `status` is selected (and clear `status` when a group is selected).
It updates `client/src/pages/admin/UserManagement.tsx` to initialize the role filter
from `?role=REQUESTER|IT_STAFF|ADMINISTRATOR` and synchronize that filter on URL
navigation. Total accounts opens `/admin/users` without a role filter. These use
the existing admin API `role` parameter; no new admin API parameter is introduced.
API-19, UI-11, UI-12, and E2E-03 cover the links and their destinations.

### Staff routes become operational-role routes

Every `/api/staff/*` endpoint in Lab 3 (queue, assignees, detail, owner, priority,
status) now permits `IT_STAFF` **and** `ADMINISTRATOR` (ADR-0010, BR-20). Requesters
remain `403 FORBIDDEN`. `GET /api/staff/assignees` lists active `IT_STAFF` and
`ADMINISTRATOR` users as assignment targets, ordered by name, with the existing
`id`, `name`, and `role` fields. This matches the owner endpoint's validation and
makes ADR-0010 reassignment reachable from the UI: either operational role may
assign an already-owned Ticket to an active Administrator, including themselves.
Inactive users and Requesters are never assignment targets.

### GET /api/staff/tickets/:id

Adds to the existing payload:

```json
{
  "version": 4,
  "permittedTransitions": ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]
}
```

`permittedTransitions` is the server's matrix result for the current status, so the
UI never derives transitions independently (FR-07). Roles: IT Staff and
Administrator. The Requester Ticket detail payload adds `version` but no
`permittedTransitions`; Requesters have no transitions to render.

### PATCH /api/staff/tickets/:id/owner

```json
{ "ownerId": 2, "expectedVersion": 4 }
```

- **200**: `{ "ticketId": 12, "ticketOwnerId": 2, "status": "OPEN", "permittedTransitions": ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], "ticketVersion": 5, "message": "Ticket ownership updated." }`
- **400**: invalid/inactive owner.
- **409 STALE_UPDATE**.

### PATCH /api/staff/tickets/:id/priority

```json
{ "itPriority": "HIGH", "expectedVersion": 5 }
```

- **200**: `{ "ticketId": 12, "itPriority": "HIGH", "ticketVersion": 6, "message": "IT Priority updated." }`
- **400**: invalid priority.
- **409 STALE_UPDATE**.

### PATCH /api/staff/tickets/:id/status

```json
{ "status": "RESOLVED", "expectedVersion": 6 }
```

- **200**: `{ "ticketId": 12, "status": "RESOLVED", "permittedTransitions": ["CLOSED", "REOPENED"], "ticketVersion": 7, "message": "Status updated successfully." }`
- **400 INVALID_STATUS_TRANSITION**: invalid, same-status, or terminal-source
  transition (BR-15, BR-16).
- **409 STALE_UPDATE**.

Owner and status mutation responses also return `permittedTransitions` for the
resulting status. This keeps the badge, choices, and version in sync immediately
after a status change or the `NEW` → `OPEN` assignment rule, without duplicating
the matrix in the client (FR-07, BR-19).

### POST /api/tickets/:id/resolve-indication

**Roles**: owning Requester only. Requires `expectedVersion` just like the other
Ticket mutations (FR-06, BR-12). The indication bumps the version (BR-11) and never
changes `status` (BR-18). The Requester detail screen takes the version from its
Ticket payload and includes it in the request:

```json
{ "expectedVersion": 7 }
```

- **400 VALIDATION_FAILED**: missing, negative, or non-integer `expectedVersion`.
- **403 FORBIDDEN**: IT Staff or Administrator.
- **404 TICKET_NOT_FOUND**: missing Ticket or non-owning Requester.
- **409 STALE_UPDATE**: stale version; neither the indication nor version changes.
- **200 OK**: existing response fields plus `ticketVersion`:

```json
{
  "id": 12,
  "resolvedByRequester": true,
  "ticketVersion": 8,
  "message": "Problem indicated as resolved. IT Staff will review and formally close the ticket."
}
```

A staff member holding version `7` then receives `409 STALE_UPDATE` on their next
write; API-12 asserts that the advisory indication invalidates that stale view.

### Other Ticket responses

`GET /api/tickets`, `GET /api/tickets/:id`, and `GET /api/staff/tickets` add
`version` to each item/ticket object. No key is removed.

---

## 4. Concurrency Rules

1. `expectedVersion` is required on Actions Taken create/update (§1) and the
   Ticket mutations in §3 (owner, priority, status, and Requester resolution
   indication). Missing, negative, or non-integer answers `400 VALIDATION_FAILED`.
2. The server performs a conditional write
   (`WHERE id = :ticketId AND version = :expectedVersion`) and increments `version`
   in the same statement. Zero affected rows means the caller was stale.
3. A stale write answers `409 STALE_UPDATE` with `fields.expectedVersion` naming both
   versions. Nothing is partially applied.
4. Every successful mutation response returns the new `ticketVersion`, so a client
   can continue without a re-fetch.
5. The conditional Ticket update/version increment and ActionTaken insert/update
   execute in one database transaction (BR-12, BR-13). A stale version, missing
   action, constraint failure, or failed action write rolls back both changes.
   Concurrent or sequential creates with the same `expectedVersion` yield one
   `201`, one `409 STALE_UPDATE`, exactly one action row, and one version increment.
   API-07 covers both schedules; API-27 proves rollback on create/update failures.
6. Public Comments and Internal Notes are append-only discussion and do not bump
   `version`.

---

## 5. Retired Endpoints

`GET /api/requesters` is removed in Lab 4 (D-28, BR-30). It existed only to populate
the Development Requester selector, which authenticated identity replaced in Lab 3.
Requests now fall through to the standard 404.

The header identity path is also retired (BR-30): delete the `X-Requester-Id`
fallback in `server/src/middleware/requester-context.ts` and the separate fallback
in `server/src/routes/attachments.ts`. Remove the unauthenticated ticket-create
exception returning `400 REQUESTER_CONTEXT_MISSING`; no session now means
`401 UNAUTHENTICATED`. API-28 verifies these paths, including Staff/Admin ids in
the header and a session combined with a conflicting header.

---

## 6. Regression Guarantees

- Authenticated read payloads retain their existing fields and add `version` to
  Tickets. `statusGroup` is the only new optional Ticket-list query parameter.
- Ticket mutations, including resolution indication, require `expectedVersion`
  (BR-12); legacy mutation tests are updated to fetch and send it.
- Session authentication replaces header-only identity everywhere (BR-30);
  `/api/requesters` is removed. The exact legacy test updates are in `tests.md` §5.
- Attachment upload/download/soft-removal, comments, notes, password change, and
  User Management retain their behavior for permitted authenticated callers.
  Administrator ticket access widens per ADR-0010; IT Staff cannot manage users.
