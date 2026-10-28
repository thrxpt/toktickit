# Lab 4 Sprint Engineering Specification

Companion documents forming the complete Sprint 4 contract:
[`api-spec.md`](./api-spec.md), [`ui-spec.md`](./ui-spec.md), [`tests.md`](./tests.md).
Domain terminology is defined by [`CONTEXT.md`](../../CONTEXT.md). Architectural
decisions are recorded in [`docs/adr/`](../adr/).

Lab 4 extends, and must not regress, the Lab 3 contract in
[`docs/lab-03/`](../lab-03/specification.md).

---

## 1. Sprint Goal

Complete the TokTickIT service-desk workflow by letting IT Staff record the actual
work done on a Ticket as Actions Taken, finalizing the Ticket lifecycle rules, and
giving every role a concise dashboard as an operational starting point. The whole
application built across Labs 1–3 is polished, hardened, and regression-verified so
it can be demonstrated as a finished product, not a collection of slices.

---

## 2. Stakeholder Request Interpretation

The service desk accepts Tickets and lets IT Staff talk to Requesters, but there is
no reliable record of the work itself, and nobody can see the state of the desk at a
glance. The stakeholder asks for four things:

1. **Actions Taken** — each Ticket carries a work log. Each entry records Action
   Date/Time, Action Description, Result, Performed by (automatic), Follow-Up
   Required?, Follow-up Note (mandatory when follow-up is required), and Attachment
   Notes (a narrative pointer to supporting files). A Ticket has exactly one primary
   Ticket Owner, but any IT Staff member may record an action, because the work is
   shared while accountability stays with the Owner.
2. **Workflow discipline** — Requesters may continue to indicate that a problem
   appears resolved, but only IT Staff formally resolve, close, reopen, or cancel a
   Ticket. The final transition matrix is enforced by the backend, even against a
   client that bypasses the screen.
3. **Dashboards** — Requesters see only their own Tickets summarized; IT Staff see
   the operational desk; Administrators see the same operational picture plus account
   counts. Every card links to the detailed list it summarizes rather than replacing
   it.
4. **Final polish** — the complete application keeps every earlier behavior working,
   removes leftover temporary UI, and presents one coherent Zen Green product.

The handout (§4.3) additionally assigns Administrators the ability to perform IT
Staff ticket behavior for support and testing. That supersedes the Lab 3 segregation
decision ADR-0008 in one direction only: IT Staff still cannot access User
Management. This reversal is recorded in ADR-0010 and D-22.

Hiding UI controls is explicitly insufficient: every rule below is enforced
server-side, and the UI merely guides the user toward what the server allows.

---

## 3. Scope

### Included

- **Actions Taken**: new per-Ticket work log with create, update, and role-scoped
  read; automatic Performed by; conditional Follow-up Note; Attachment Notes as text.
- **Ticket version and stale-update protection**: an additive `version` column and a
  required `expectedVersion` on every mutating Ticket operation, answering `409` with
  `STALE_UPDATE` when a caller's view is out of date.
- **Final Ticket lifecycle**: the transition matrix and role authorization are
  finalized, exposed to the UI from the server, and enforced even against a
  bypassing client. Requester resolution indication remains advisory.
- **Role dashboards**: Requester, IT Staff, and Administrator dashboards, computed
  server-side, with defined metrics, drill-down parameters, empty behavior, and
  loading/error/forbidden states.
- **Seed increment**: idempotent demo data covering all statuses, priorities,
  assigned and unassigned ownership, and Tickets with zero, one, and many Actions
  Taken, sufficient to demonstrate non-zero and zero dashboard metrics.
- **Hardening and regression**: all Lab 1–3 behavior preserved; obsolete Lab 2
  Development Requester UI removed; duplicate submissions and stale writes handled;
  forms preserve entered data after recoverable failures; accessibility and
  responsive rules verified across the new screens.
- **Evidence**: test plan with AC traceability, E2E journeys, screenshots under
  `artifacts/lab-04/`, and updated README setup/seed/migration/demo instructions.

### Explicitly Excluded

- SLA clocks, breach warnings, escalation engines, on-call scheduling.
- Email, SMS, LINE, push, or any external notification service.
- Inventory, spare-parts management, purchasing, or cost accounting.
- Time-sheet billing, payroll, or labour-cost calculation.
- Multi-level approval workflows and electronic signatures.
- BI tools, custom report builders, export warehouses.
- Multi-tenancy and production-scale cloud operations.
- Uploading new files as Action Taken evidence: Attachment Notes is text, and file
  bytes stay on the existing Ticket Attachment model.
- Editing or deleting an Action Taken's author, creation timestamp, or history;
  actions can be updated in place but never deleted (contrast with Comments, which
  are strictly append-only).
- Requesters performing any Ticket status transition or writing Actions Taken.
- New product features not named in this contract.

---

## 4. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-01 | IT Staff and Administrators can record an Action Taken on any accessible Ticket with Action Description, Result, optional Follow-Up Required, conditional Follow-up Note, and optional Attachment Notes. |
| FR-02 | The backend sets Performed by from the authenticated session; the client can neither choose nor change it. |
| FR-03 | IT Staff and Administrators can update an existing Action Taken's description, result, follow-up fields, and attachment notes. |
| FR-04 | The owning Requester, IT Staff, and Administrators can list all Actions Taken on a Ticket in ascending Action Date/Time order. |
| FR-05 | A Requester who does not own the Ticket cannot read its Actions Taken, and receives `404` consistent with ownership protection. |
| FR-06 | The backend exposes each Ticket's current version, requires `expectedVersion` on every mutating Ticket operation, and answers `409 STALE_UPDATE` when the caller's version is stale. |
| FR-07 | The backend returns the permitted status transitions for a Ticket, and the UI offers only those transitions for the caller's role. |
| FR-08 | The backend enforces the final status-transition matrix and the resolution gate even when a client calls the API directly; invalid and same-status transitions are rejected. |
| FR-09 | A Requester's "Problem Appears Resolved" indication is recorded but never changes Ticket status; only IT Staff or Administrators may set `RESOLVED`, `CLOSED`, `REOPENED`, or `CANCELLED`. |
| FR-10 | A Requester dashboard reports total open Tickets, Tickets waiting for the Requester, recently updated Tickets, and recently resolved Tickets, scoped to the authenticated Requester. |
| FR-11 | An IT Staff dashboard reports unassigned Tickets, Tickets owned by the caller, counts by status, counts by IT Priority, and recently updated Tickets. |
| FR-12 | An Administrator dashboard reuses the IT Staff metrics and adds concise user-account counts. |
| FR-13 | Every dashboard metric or list drills down to the corresponding filtered My Tickets or Ticket Queue view. |
| FR-14 | Dashboards define loading, empty, forbidden, and safe-failure states; an empty dataset renders zero values and empty lists, never an error. |
| FR-15 | All dashboard values are computed by the backend from authoritative data; the client never derives metrics from partial collections. |
| FR-16 | Role-appropriate Dashboard navigation appears for every Role with a clear active-page indication. |
| FR-17 | The IT Staff Ticket Detail screen lists Actions Taken, supports create and edit modes, and validates the conditional Follow-up Note before submission. |
| FR-18 | The Requester Ticket Detail screen shows all Actions Taken on the owned Ticket strictly read-only. |
| FR-19 | Duplicate submissions caused by repeated clicking or network retry are prevented or safely rejected; only one record results. |
| FR-20 | Forms preserve entered data after recoverable failures, including `409` conflicts, and offer a refresh path. |
| FR-21 | The seed becomes idempotent demo data covering all statuses, priorities, ownership states, and zero/one/many Actions Taken, without duplicating on re-run. |
| FR-22 | The obsolete Development Requester selection screen and its unauthenticated reference endpoint are removed, and their Lab 2 evidence tests are updated to authenticated sessions without weakening their assertions. |
| FR-23 | The completed application preserves all Labs 1–3 authentication, authorization, Requester, IT Staff, Administrator, comment, note, and attachment behavior. |
| FR-24 | Administrator users can reach the IT Staff Ticket Queue, Ticket Detail, and ticket operations (ADR-0010), while IT Staff remain unable to reach User Management. |

---

## 5. Business Rules

### Handout-Mandated Business Rules

| ID | Rule |
| --- | --- |
| BR-01 | An Action Taken belongs to exactly one Ticket. |
| BR-02 | The Ticket Owner coordinates the Ticket, but an Action Taken may be recorded by a different IT Staff member or an Administrator. |

### Action Taken Rules

| ID | Rule |
| --- | --- |
| BR-03 | Performed by is derived from the authenticated session and is immutable after creation. |
| BR-04 | Follow-up Note is required if and only if Follow-Up Required is true; supplying one when false, or omitting one when true, is rejected with `400`. |
| BR-05 | Action Description and Result are required, trimmed of surrounding whitespace, and bounded to 1–2,000 characters. |
| BR-06 | Attachment Notes is optional free text bounded to 1,000 characters; it never creates an Attachment row and never stores file bytes. |
| BR-07 | Action Date/Time is the server-generated creation timestamp, immutable after creation; Actions Taken list in ascending order. |
| BR-08 | Any active IT Staff member or Administrator may create or update Actions Taken on any accessible Ticket. |
| BR-09 | An owning Requester may read all Actions Taken on the Ticket; a non-owning Requester receives `404` (ADR-0005). |
| BR-10 | Requesters may never create, update, or delete Actions Taken; the backend answers `403 FORBIDDEN`. |

### Concurrency and Versioning

| ID | Rule |
| --- | --- |
| BR-11 | Every write to a Ticket-owned field (owner, IT Priority, status, resolution indication, Actions Taken create/update) increments `version` by one; Public Comments and Internal Notes do not. |
| BR-12 | Mutating Ticket endpoints require `expectedVersion`; a mismatch answers `409 STALE_UPDATE` and changes nothing. The comparison and increment are atomic. |
| BR-13 | A repeated submission carrying the same `expectedVersion` is rejected with `409 STALE_UPDATE`, so a double-click or retry cannot create two Actions Taken. |

### Ticket Lifecycle and Resolution

| ID | Rule |
| --- | --- |
| BR-14 | The permitted statuses remain `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`. |
| BR-15 | The final transition matrix is: `NEW` → `OPEN`, `IN_PROGRESS`, `CANCELLED`; `OPEN` → `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`; `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`; `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`; `RESOLVED` → `CLOSED`, `REOPENED`; `CLOSED` → `REOPENED`; `REOPENED` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`; `CANCELLED` is terminal. |
| BR-16 | A transition to the current status is rejected. |
| BR-17 | Only IT Staff and Administrators may change status; Requesters receive `403 FORBIDDEN`. |
| BR-18 | The resolution gate: only IT Staff or Administrators may set `RESOLVED` or `CLOSED`. A Requester's resolution indication never changes status and never bypasses this gate. |
| BR-19 | Claiming or reassigning an unassigned `NEW` Ticket advances it to `OPEN` (preserved from BR-23 of Lab 3). |

### Roles, Dashboards, and Visibility

| ID | Rule |
| --- | --- |
| BR-20 | Administrators may access the IT Staff Ticket Queue and perform every IT Staff ticket operation, and share the IT Staff dashboard (ADR-0010, supersedes ADR-0008 for this direction). |
| BR-21 | Dashboard metrics are computed by the backend with the definitions in §2 of `api-spec.md`; values are integers, counts never negative, and lists are ordered `updatedAt` descending. |
| BR-22 | "Recently" means the five most recent matching Tickets by `updatedAt`; no date window or time zone boundary participates in any Lab 4 metric. |
| BR-23 | The Requester dashboard is scoped by the session user's `requesterId`; a caller can never see another Requester's counts or Tickets. |
| BR-24 | Dashboard endpoints returning no matching data answer `200` with zeros and empty lists, never `404` or `500`. |
| BR-25 | Every dashboard count and list has a documented drill-down destination built from `api-spec.md` query parameters. |

### Data Integrity, Migration, and System Behavior

| ID | Rule |
| --- | --- |
| BR-26 | The database seed is idempotent: repeated runs converge without duplicates, upserting on natural keys, including the new demo Tickets and Actions Taken. |
| BR-27 | The migration is additive and preserves every Lab 1–3 row; legacy Tickets without Actions Taken remain valid and appear normally in dashboards. |
| BR-28 | Error responses never expose stack traces, SQL, Prisma errors, filesystem paths, or internal identifiers. The new failure codes introduced by Lab 4 are `STALE_UPDATE` and `ACTION_TAKEN_NOT_FOUND`; existing codes such as `INVALID_QUERY_PARAMETER` are reused. |
| BR-29 | Every write operation is authorized server-side; UI visibility is never treated as authorization. |
| BR-30 | The Development Requester selector and its reference endpoint are retired; authenticated identity is the only source of ownership. |
| BR-31 | Every Lab 1–3 behavior continues to pass its existing automated tests, except the Development Requester retirement updates named in `tests.md` §5. |
| BR-32 | All new UI uses only Zen Green tokens from `theme.css`; no hex values appear in any other file. |

---

## 6. UI Specification Summary

Full screen structure, component behavior, states, responsive rules, and accessibility
requirements are detailed in [`ui-spec.md`](./ui-spec.md).

- **Navigation**: `REQUESTER` — Dashboard, My Tickets, Create Ticket. `IT_STAFF` —
  Dashboard, Ticket Queue. `ADMINISTRATOR` — Dashboard, Ticket Queue, Users. The
  active page is indicated with the existing Zen Green nav treatment.
- **Dashboard (`/dashboard`)**: role-switched metric cards. Requester: Open Tickets,
  Waiting for You, Recently Updated list, Recently Resolved list. IT Staff: Unassigned,
  Owned by Me, counts by status, counts by IT Priority, Recently Updated list.
  Administrator: the IT Staff cards plus account counts. Every card links to its
  filtered detail list.
- **Actions Taken on Ticket Detail**: staff see a fourth tab "Actions Taken" with an
  ordered table (Action Date/Time, Description, Result, Performed by, Follow-Up
  badge/note, Attachment Notes) and "Record Action" create mode plus per-row edit.
  Requesters see the same content read-only in a plain section.
- **Workflow feedback**: the status control renders only the transitions supplied by
  the server. A `409` conflict renders an alert with the other writer's outcome
  explained and a "Reload ticket" action, while entered form data survives.
- **States**: `StateBlock` covers loading, empty, no-results, and error on every new
  surface. Empty dashboards render friendly zero-value copy, not blank space.
- **Responsive**: dashboards stack to one column and Actions Taken renders as cards
  below 768 px, with no horizontal page scroll and 44 px touch targets.
- **Accessibility**: metric cards are labelled headings with the value in text,
  drill-downs are real links with accessible names, badges pair colour with text,
  and focus remains visible.

---

## 7. Data Changes

### Actions Taken Model

Add a first-class `ActionTaken` model. It is intentionally separate from `Comment`
and `InternalNote`, because its fields, validation, and role rules differ:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `Int` autoincrement | Primary key |
| `ticketId` | `Int` FK → `Ticket.id`, on delete restrict | BR-01 |
| `description` | `String` | Action Description, 1–2,000 trimmed |
| `result` | `String` | Result, 1–2,000 trimmed |
| `performedById` | `Int` FK → `User.id`, on delete restrict | BR-03, immutable |
| `followUpRequired` | `Boolean` default `false` | |
| `followUpNote` | `String?` | Required iff flag set (BR-04) |
| `attachmentNotes` | `String?` | Free text ≤1,000 (BR-06) |
| `createdAt` | `DateTime` default `now()` | Action Date/Time, immutable (BR-07) |
| `updatedAt` | `DateTime` `@updatedAt` | Edit timestamp |

Index: `@@index([ticketId, createdAt(sort: Asc)])` for ordered reads.
Relation: `Ticket.actionsTaken ActionTaken[]` and `User.performedActions ActionTaken[]`.

### Ticket Version

`Ticket` gains `version Int @default(0)`. The column is additive and initialized for
every existing row by the migration default; no backfill script is required. Every
write to a Ticket-owned field increments it atomically (BR-11, BR-12).

### Migration, Backfill, and Recovery

- One additive Prisma migration creates `ActionTaken` and adds `Ticket.version`.
  Nothing is dropped or renamed, so all Lab 1–3 rows survive untouched.
- No backfill is needed: a Ticket with zero Actions Taken is valid (legacy Tickets
  and newly created Tickets alike), and dashboards read Ticket fields only.
- Rollback: the migration is reversible by dropping the new table and column; the
  documented recovery path is restoring the pre-migration dump if the down migration
  is unavailable in a grading environment. The migration, its reverse, and the
  restoration of the seeded baseline are exercised by API-23; seed convergence is
  API-22.

### Seed

`seedReferenceData` grows an idempotent demo-data section. Users, Categories, and
Related Systems keep their existing natural keys. Demo Tickets use **stable Ticket
Numbers** (the natural key) and upsert rather than insert; Actions Taken upsert on
their `(ticketId, description)` pair. The demo set covers:

- every status at least once, including `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`,
  `REOPENED`, and `CANCELLED`;
- every IT Priority including `CRITICAL`, and an unassigned Ticket;
- Tickets owned by both seeded IT Staff members and by no one;
- at least one Ticket with zero Actions Taken, one with exactly one, and one with
  three or more, attributed to two different performers;
- at least two Requesters, one with non-zero dashboard metrics and one with zero, to
  demonstrate both states.

Because seeded transactional data now exists, the verification harness adapts:
per-test truncation deletes `ActionTaken` before `Ticket`; the Playwright cleanup
re-runs the full demo seed so the baseline is restored. Both behaviors are asserted
in API-23.

### Justified Database Decisions

1. **Version column over `updatedAt` comparison.** Timestamp comparison is
   fragile across time zones and serialization formats, and cannot distinguish two
   writes in the same millisecond. An integer version is deterministic and makes the
   conditional update atomic (`WHERE id = ? AND version = ?`).
2. **Dedicated `ActionTaken` table over extending `Comment`.** Reusing a shared
   discussion table would force nullable follow-up columns onto Comments and weaken
   the append-only rule that Comments keep; a dedicated model gives each concept its
   own validation and read rules.
3. **Text `attachmentNotes` over Action-to-Attachment joins.** The stakeholder asks
   for a pointer to "what file to look for", not a second upload path; duplicating
   bytes or links would create two sources of truth for the same evidence.

---

## 8. API Contract Summary

Full payloads, validation, authorization, status codes, and error envelopes are in
[`api-spec.md`](./api-spec.md).

| Category | Method & Path | Permitted Roles | Description |
| --- | --- | --- | --- |
| Actions | `GET /api/tickets/:id/actions` | Owning Requester, IT Staff, Admin | List Actions Taken in ascending order |
| Actions | `POST /api/tickets/:id/actions` | IT Staff, Admin | Record an Action Taken |
| Actions | `PATCH /api/tickets/:id/actions/:actionId` | IT Staff, Admin | Update an Action Taken |
| Dashboard | `GET /api/dashboard/requester` | Requester | Own-Ticket metrics and recent lists |
| Dashboard | `GET /api/dashboard/staff` | IT Staff, Admin | Operational metrics; account counts for Admin |
| Staff | `GET /api/staff/tickets/:id` | IT Staff, Admin | Detail now includes `version` and `permittedTransitions` |
| Staff | `PATCH /api/staff/tickets/:id/owner`, `/priority`, `/status` | IT Staff, Admin | Now require `expectedVersion`; return new `version` |
| Requester | `POST /api/tickets/:id/resolve-indication` | Requester | Bumps `version`; status unchanged |

The additive response fields are `version` (all Ticket payloads),
`ticketVersion` (mutation responses), and `permittedTransitions` (the IT Staff and
Administrator Ticket detail payload). Existing payload keys keep their meaning, so
Lab 2–3 clients continue to parse responses.

---

## 9. Acceptance Criteria

| ID | Criterion (Given-When-Then) |
| --- | --- |
| AC-01 | **Given** permitted IT Staff and a valid action payload, **when** they create an Action Taken, **then** it is stored under the correct Ticket with the authenticated performer and `201`. |
| AC-02 | **Given** an existing Action Taken, **when** an authorized user updates its fields, **then** the changes persist, while Performed by and Action Date/Time stay unchanged. |
| AC-03 | **Given** Follow-Up Required is true, **when** the request omits a Follow-up Note, **then** the API answers `400 VALIDATION_FAILED` with a field error; when false, supplying a note is equally rejected. |
| AC-04 | **Given** a Requester who owns the Ticket, **when** they list Actions Taken, **then** all actions are returned ascending; an unrelated Requester receives `404`. |
| AC-05 | **Given** a Requester, **when** they attempt to create or update an Action Taken, **then** the backend answers `403 FORBIDDEN` and no row changes. |
| AC-06 | **Given** a Ticket id that does not exist or an action id belonging to another Ticket, **when** requested, **then** the API answers `404` with `TICKET_NOT_FOUND` or `ACTION_TAKEN_NOT_FOUND`. |
| AC-07 | **Given** two writers with the same `expectedVersion`, **when** both create an Action Taken, **then** the first succeeds and the second answers `409 STALE_UPDATE`, leaving exactly one row. |
| AC-08 | **Given** a stale `expectedVersion`, **when** status, owner, or IT Priority is updated, **then** the API answers `409 STALE_UPDATE` and the Ticket is unchanged. |
| AC-09 | **Given** the final matrix, **when** any transition is attempted, **then** permitted transitions succeed, and invalid, same-status, or post-`CANCELLED` transitions answer `400 INVALID_STATUS_TRANSITION`. |
| AC-10 | **Given** the staff Ticket Detail payload, **when** it renders, **then** the status control offers exactly `permittedTransitions`, and a successful change refreshes the displayed status and version. |
| AC-11 | **Given** a Requester indication, **when** it is recorded, **then** status is unchanged and no endpoint allows a Requester to set any status. |
| AC-12 | **Given** an authenticated Requester, **when** dashboard data is retrieved, **then** only metrics and lists for that Requester's Tickets are returned. |
| AC-13 | **Given** seeded demo data, **when** the IT Staff dashboard is retrieved, **then** unassigned, owned-by-me, status, and priority counts match direct database queries. |
| AC-14 | **Given** an Administrator, **when** the staff dashboard is retrieved, **then** the IT Staff metrics plus user-account counts are returned. |
| AC-15 | **Given** any dashboard card, **when** followed, **then** it opens the documented filtered My Tickets or Ticket Queue view whose contents match the metric. |
| AC-16 | **Given** a Requester with no Tickets, **when** their dashboard loads, **then** zero counts and empty lists render with an empty state, and the API answered `200`. |
| AC-17 | **Given** a role using a dashboard endpoint it does not own, **when** it calls the API, **then** the response is `403 FORBIDDEN`. |
| AC-18 | **Given** the Actions Taken UI, **when** a staff member creates or edits an action, **then** the list reflects server order and conditional Follow-up validation, and a rapid double submit produces one record. |
| AC-19 | **Given** the Requester Ticket Detail, **when** Actions Taken exist, **then** they render read-only with no create or edit controls, while the API still rejects writes. |
| AC-20 | **Given** a `409` conflict during an edit, **when** the UI handles it, **then** the user's entered data is preserved, a clear conflict message appears, and a reload control is offered. |
| AC-21 | **Given** a database from Lab 3, **when** the Lab 4 migration runs, **then** every existing row remains valid, legacy zero-action Tickets behave normally, and re-running the seed produces no duplicates. |
| AC-22 | **Given** the full test suite, **when** it runs on `lab4-staging`, **then** all Lab 1–3 tests pass except the documented Development Requester retirement updates, and no test is skipped to achieve that result. |
| AC-23 | **Given** an Administrator, **when** they open the Ticket Queue and record an action or change status, **then** it succeeds; **given** IT Staff, **when** they open User Management, **then** they receive `403`. |
| AC-24 | **Given** keyboard or screen-reader use, **when** operating dashboards and Actions Taken, **then** focus is visible, controls have accessible names, and status/priority are conveyed without colour alone. |
| AC-25 | **Given** 390 px, 768 px, and 1280 px viewports, **when** any Lab 4 screen is rendered, **then** there is no clipping, overlap, or horizontal page scroll. |
| AC-26 | **Given** any failing request, **when** the error is displayed, **then** it uses the standard envelope with a safe message and exposes no internals. |

---

## 10. Product Definition of Done

### Product Increment

1. **Actions Taken** work end to end: staff create, update, and read; Requesters read
   their own; Performed by is automatic; Follow-up Notes are conditional; Attachment
   Notes are recorded.
2. **Workflow** is final: the matrix and resolution gate are server-enforced, the UI
   offers only permitted transitions, and Requesters remain advisory-only.
3. **Dashboards** are accurate, role-scoped, drillable, and pleasant when empty.
4. **Concurrency safety**: stale and duplicate writes are rejected visibly, and no
   user silently overwrites another's work.
5. **Regression**: every Labs 1–3 flow works on `main` after release, with evidence.

### Engineering

1. Every AC-01–AC-26 maps to at least one planned test in `tests.md`, and every row
   is green (or explicitly waived in writing with a date and reason).
2. Unit, API, UI, style, responsive, and E2E suites all pass; the full suite is run on
   the integration branch before release.
3. Migration applies cleanly to a Lab 3 database and the seed re-runs without
   duplicates.
4. `tsc` typechecks and the client builds; no console errors, broken links, or
   placeholder content remain.
5. No hex colour outside `theme.css`; no new dependency outside the locked stack.
6. Contract PR merged into `lab4-staging` before implementation PRs; feature branches
   merge through reviewed PRs; `lab4-staging` merges into `main` for release.
7. README documents setup, migration, seed, test, and demonstration instructions
   that actually work from a clean clone.
8. The handout's required repository structure is complete: `docs/lab-04/` holds the
   four contract documents, `reviewer.md` (the peer-review record, never
   self-certified before a verdict exists), and `ai-use.md` (prompts and
   reflection); `artifacts/lab-04/` holds the committed screenshots the UI
   checklist requires.

---

## 11. Assumptions and Decisions

- **D-22 (Administrator ticket access)**: The handout (§4.3) requires Administrators
  to perform IT Staff behavior, which supersedes ADR-0008 in one direction:
  Administrators may browse the queue, open Ticket Detail, claim/assign, set IT
  Priority, transition status, comment, note, and record Actions Taken. IT Staff
  remain barred from User Management, and Administrators still cannot manage roles
  through ticket screens. *Beat*: keeping the strict segregation, which would make
  the handout's Administrator requirement unimplementable. Recorded as ADR-0010.
- **D-23 (Version-based concurrency)**: A monotonically increasing integer `version`
  guards Ticket mutations; clients send `expectedVersion` and receive the new version
  in every mutation response. *Beat*: `updatedAt` comparison, which is fragile across
  serialization and cannot order same-millisecond writes.
- **D-24 (Action Date/Time = creation timestamp)**: The stakeholder asks for an
  Action Date/Time and the handout's UI section calls it "Action create date/time";
  a single immutable server timestamp satisfies both and cannot be back-dated by a
  client. *Beat*: a separate user-entered date field, which invites inconsistency and
  has no requirement to support it.
- **D-25 (Attachment Notes as text)**: The field points at existing files; the
  Attachment model stays the single source for bytes and metadata. *Beat*: linking
  Actions to Attachment rows or adding an upload flow, both outside the stated need.
- **D-26 (No time-zone-dependent metrics)**: "Recently" is defined by list length,
  not date windows, so dashboard values are deterministic in every time zone and
  testable without clock control. *Beat*: "updated in the last 7 days", which needs a
  time zone definition and clock manipulation in tests.
- **D-27 (Demo seed becomes transactional)**: The handout requires representative
  Tickets and Actions Taken, so the seed grows beyond reference data. Tests isolate
  with truncation; E2E cleanup restores the full demo baseline. *Beat*: seeding only
  reference data and asking graders to create demo data by hand.
- **D-28 (Development Requester retirement completed)**: The `/select-requester`
  screen and `/api/requesters` endpoint are removed; Lab 2 E2E specs move to
  authenticated login while preserving their ticket-behavior assertions. *Beat*:
  leaving an unauthenticated identity selector in a fully authenticated product.
- **D-29 (Dashboards reverse Lab 3's KPI exclusion)**: Lab 3 explicitly excluded "KPI
  dashboards" because Lab 4 owns them; the Lab 4 handout (§4.6) now authorizes a
  small, fixed set of operational metrics. The dashboards remain summaries with
  drill-downs, not reporting tools, so the earlier exclusion's intent (no BI) still
  holds. *Beat*: keeping the exclusion and shipping no dashboards in the lab whose
  requirements name them.
