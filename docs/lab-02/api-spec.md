# Lab 2 REST API Contract

Authoritative for request and response shapes, validation, and status codes.
Behaviour rules are numbered in [`specification.md`](./specification.md) and referenced
here as BR-nn. This document is the source of truth for validation limits; the client
mirrors them for immediate feedback only.

## Conventions

All paths are relative and reach Express through the Vite dev proxy (ADR-0002).
All request and response bodies are JSON, except Attachment upload (multipart) and
Attachment content (binary).

### Requester context

Every route except `/api/health`, `/api/categories`, `/api/related-systems`, and
`/api/requesters` requires:

```http
X-Requester-Id: 3
```

Middleware resolves it once into `req.requesterId` (ADR-0003). A `requesterId` field
appearing in any request body is rejected with 400 `REQUESTER_ID_IN_BODY` — it is never
used as a fallback (BR-04).

| Condition | Status | Code |
|---|---|---|
| Header absent | 400 | `REQUESTER_CONTEXT_MISSING` |
| Header not a positive integer | 400 | `REQUESTER_CONTEXT_INVALID` |
| Requester unknown | 400 | `REQUESTER_CONTEXT_INVALID` |
| Requester inactive | 400 | `REQUESTER_INACTIVE` |

400 rather than 401 deliberately: 401 would imply an authentication scheme that Lab 2
explicitly does not have (BR-03).

### Error envelope

Every failure on every route:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "fields": { "summary": "Summary must be at least 5 characters." }
  }
}
```

`fields` is present only for field-level validation failures. `message` is always safe for
display. No response ever carries a stack trace, SQL, Prisma error, filesystem path, or
internal identifier (BR-43).

### Status codes

| Status | Used for |
|---|---|
| 200 | Successful read; successful soft removal (returns updated metadata) |
| 201 | Ticket created; Attachment uploaded. Carries `Location`. |
| 400 | Validation failure; invalid query parameter; any requester-context failure |
| 404 | Resource missing **or** not owned by the Development Requester (BR-08); content of a removed Attachment |
| 409 | Attachment limit reached; Ticket Number uniqueness backstop |
| 413 | Uploaded file exceeds 5 MB |
| 415 | Uploaded file type not permitted |
| 500 | Unexpected server error, generic message only |

---

## GET /api/health

Unchanged from Lab 1. No requester context required.

**200** — `{ "status": "ok", "service": "TokTickIT API" }`

## GET /api/categories

Active Categories, ascending by id. No requester context required.

**200** — `[{ "id": 1, "name": "Account and Access" }, …]`

The response shape is unchanged from Lab 1 so that API-02 (lab-01) continues to pass;
the only change is the `isActive` filter.

**500** — `{ "error": { "code": "DATABASE_UNAVAILABLE", "message": "Unable to reach the database" } }`

## GET /api/related-systems

Active Related Systems, ascending by name. No requester context required.

**200** — `[{ "id": 1, "name": "Campus Wi-Fi" }, …]`

## GET /api/requesters

Active Requesters for the selection screen. No requester context required — this is the
route that establishes it.

**200** — `[{ "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.ac.th" }, …]`

Inactive Requesters never appear (BR-05). An empty array is a valid response and drives
the selector's empty state, not an error.

---

## POST /api/tickets

Creates one Ticket owned by the Development Requester.

**Request**

```json
{
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "categoryId": 2,
  "relatedSystemId": 7,
  "requestedPriority": "MEDIUM"
}
```

| Field | Rules |
|---|---|
| `summary` | required, trimmed, 5–150 chars (BR-20) |
| `description` | required, trimmed, 10–4000 chars (BR-21) |
| `categoryId` | required, integer, must reference an **active** Category (BR-16) |
| `relatedSystemId` | required, integer, must reference an **active** Related System (BR-17) |
| `requestedPriority` | required, one of `LOW` \| `MEDIUM` \| `HIGH`, no server default (BR-14) |

`ticketNumber`, `status`, `requesterId`, and `createdAt` are server-generated. Any of them
present in the body is ignored, except `requesterId`, which is an error (BR-04).

**201** — `Location: /api/tickets/42`

```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "requestedPriority": "MEDIUM",
  "status": "NEW",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "requester": { "id": 3, "name": "Jennifer Anderson" },
  "createdAt": "2026-08-26T09:14:00.000Z",
  "updatedAt": "2026-08-26T09:14:00.000Z"
}
```

**400** `VALIDATION_FAILED` with `fields` — any rule above.
**400** `REQUESTER_ID_IN_BODY` — body carried `requesterId`.
**409** `TICKET_NUMBER_CONFLICT` — the unique-constraint backstop on BR-12. Not expected in
normal operation; documented because a client must handle it rather than assume it away.

## GET /api/tickets

The Development Requester's Tickets only (BR-07). Never returns another Requester's rows,
under any parameter combination.

**Query parameters**

| Parameter | Type | Default | Rules |
|---|---|---|---|
| `search` | string | — | Case-insensitive substring over `ticketNumber` OR `summary` (BR-26); trimmed; ≤150 chars |
| `categoryId` | integer | — | Must reference an existing Category |
| `requestedPriority` | enum | — | `LOW` \| `MEDIUM` \| `HIGH` |
| `status` | enum | — | `NEW` |
| `sort` | enum | `createdAt` | `createdAt` \| `ticketNumber` \| `updatedAt` (BR-28) |
| `order` | enum | `desc` | `asc` \| `desc` |
| `page` | integer | `1` | ≥ 1 |
| `pageSize` | integer | `10` | One of 10, 20, 50 (BR-29) |

Filters combine by AND. An unknown parameter name, a malformed value, or a value outside
its allowed set is a 400 naming that parameter — never silently clamped or dropped (BR-30).

**200**

```json
{
  "data": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000042",
      "summary": "Laptop battery drains quickly",
      "requestedPriority": "MEDIUM",
      "status": "NEW",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "createdAt": "2026-08-26T09:14:00.000Z",
      "updatedAt": "2026-08-26T09:14:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 10, "totalItems": 14, "totalPages": 2 }
}
```

`description` is omitted from list rows; it is detail-only. A page beyond the last returns
200 with `data: []` and truthful `meta` (BR-29) — the UI distinguishes empty from
no-results using `meta.totalItems` against whether any filter is active (BR-31).

**400** `INVALID_QUERY_PARAMETER` with `fields`.

## GET /api/tickets/:id

One owned Ticket. `:id` is the numeric primary key (D-07).

**200** — the full Ticket object from `POST /api/tickets`, plus `attachments` as returned
by the Attachment metadata route below.

**404** `TICKET_NOT_FOUND` — the Ticket does not exist, **or** belongs to another Requester.
The two cases are indistinguishable to the caller by design (BR-08, ADR-0005), and are
distinguished only in server logs.

---

## GET /api/tickets/:ticketId/attachments

Metadata for one owned Ticket's Attachments, active and removed.

**200**

```json
{
  "active": [
    {
      "id": 11,
      "originalFilename": "battery-report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 284913,
      "uploadedBy": { "id": 3, "name": "Jennifer Anderson" },
      "createdAt": "2026-08-26T09:15:00.000Z",
      "contentUrl": "/api/attachments/11/content"
    }
  ],
  "removed": [
    {
      "id": 9,
      "originalFilename": "wrong-screenshot.png",
      "mimeType": "image/png",
      "sizeBytes": 51201,
      "uploadedBy": { "id": 3, "name": "Jennifer Anderson" },
      "createdAt": "2026-08-26T09:10:00.000Z",
      "removedAt": "2026-08-26T09:12:00.000Z",
      "removedBy": { "id": 3, "name": "Jennifer Anderson" },
      "removalReason": "Uploaded the wrong file"
    }
  ]
}
```

Removed entries carry **no** `contentUrl` (BR-39). `storageKey` is never exposed.

**404** `TICKET_NOT_FOUND` — missing or not owned.

## POST /api/tickets/:ticketId/attachments

Uploads one Attachment to an owned Ticket. `multipart/form-data`, single field `file`.
One file per request (ADR-0006).

Validation order matters, because it decides which error the caller sees first:

1. Ticket exists and is owned → else 404
2. Active Attachment count < 5 → else 409 (BR-35)
3. Size ≤ 5 MB → else 413 (BR-34)
4. Extension and declared MIME type both in the allowlist → else 415
5. Magic bytes match the declared type → else 415 (BR-33)

Permitted: `.jpg`/`.jpeg` (`FF D8 FF`), `.png` (`89 50 4E 47`), `.webp`
(`RIFF` … `WEBP`), `.pdf` (`%PDF`).

**201** — `Location: /api/attachments/11/content`, body is the active metadata object above.

**409** `ATTACHMENT_LIMIT_REACHED` — five active Attachments already exist. Removed ones do
not count (BR-35).
**413** `FILE_TOO_LARGE` — `{ "fields": { "file": "Each file must be 5 MB or smaller." } }`
**415** `UNSUPPORTED_FILE_TYPE` — covers both the allowlist failure and the magic-byte
mismatch. The two are not distinguished in the response: telling a caller *how* their
disguise was detected helps only the caller.
**404** `TICKET_NOT_FOUND` — missing or not owned.

On any failure nothing is persisted: no row, no file (BR-41).

## GET /api/attachments/:id/content

Streams an active Attachment belonging to a Ticket the Development Requester owns.

**200** — the bytes, with:

- `Content-Type` from the stored `mimeType`
- `Content-Length` from the stored `sizeBytes`
- `Content-Disposition: inline; filename="…"` for images, `attachment; filename="…"` for PDF

The filename in `Content-Disposition` is the stored original, sanitised for header safety.
The file itself is located by `storageKey`, which never appears in any response (BR-37).

**404** `ATTACHMENT_NOT_FOUND` — the Attachment does not exist, is **removed** (BR-39),
belongs to another Requester's Ticket (BR-40), or its file is missing from disk
(ADR-0004). All four answer identically.

## POST /api/attachments/:id/removal

Soft-removes an Attachment on an owned Ticket. Not `DELETE`: the operation records a
removal rather than destroying anything, and DELETE bodies are unreliable across clients
(D-08).

**Request** — `{ "reason": "Uploaded the wrong file" }`

`reason` is required, trimmed, 1–200 chars (BR-22, BR-42).

**200** — the removed metadata object, so the UI can re-render the row without refetching.

**400** `VALIDATION_FAILED` — reason missing, blank, or too long.
**404** `ATTACHMENT_NOT_FOUND` — missing, not owned, or **already removed**. Removal is not
idempotent-by-repetition: a second removal would overwrite the original reason and
timestamp, destroying the audit trail the feature exists to create.
