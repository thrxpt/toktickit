# Lab 2 Test Plan and Results

Planned from [`specification.md`](./specification.md) **before** implementation, per the
Test-DD requirement. This plan is not reconstructed from whatever tests the coding agent
produced; tests that do not appear here do not count as evidence.

Every acceptance criterion maps to at least one planned test (§3). Every planned test names
its real file path.

## 1. Test Strategy

Six levels, each answering a question the level below cannot:

| Level | Prefix | Answers | Tooling |
|---|---|---|---|
| Unit | `UNIT-` | Is the isolated logic correct — number format, magic bytes, validation schema? | Vitest |
| API | `API-` | Does the HTTP contract hold, including ownership and every error case? | Vitest + Supertest |
| UI component | `UI-` | Does the screen behave — states, validation, calls made and not made? | Vitest + Testing Library |
| UI style | `STYLE-` | Does the rendered markup carry the classes, labels, asterisks, and states `ui-spec.md` requires? | Vitest + Testing Library |
| Responsive | `RESP-` | Does the layout hold at three viewports without clipping or horizontal scroll? | Playwright |
| E2E | `E2E-` | Does a real Requester's whole journey work against a real database? | Playwright |

**Ownership is tested at the API level, not only the UI level.** A hidden button is not
access control; AC-20, AC-30, and AC-40 are proven by direct HTTP calls carrying another
Requester's header.

**Database isolation** (D-14): API tests run against `toktickit_test`. A vitest
`globalSetup` creates that database if it is absent, runs `prisma migrate deploy`, and
seeds reference data once; each API file truncates `Attachment` and `Ticket` in
`beforeEach`, leaving reference rows intact. This is what makes `pnpm test` repeatable —
and it fixes the Lab 1 situation where API-02 passed only because someone had remembered
to seed the development database.

The URL comes from `server/.env.test` when that file exists, and otherwise from
`server/.env`'s credentials with the database name replaced — so a clean clone needs no
manual step. Whatever the source, the resolved database name must end in `_test` or the
run aborts: the harness migrates, seeds, and truncates whatever it is given, so an
exported `DATABASE_URL` must not be able to point it at development data.

**Test IDs restart per Lab.** Lab 1's tests live under `tests/lab-01/`, Lab 2's under
`tests/lab-02/`, so `API-01` is unambiguous within its directory — and it matches the
handout's own numbering.

## 2. Planned Tests

### Unit — `server/tests/lab-02/*.unit.test.ts`

| Test ID | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|
| UNIT-01 | BR-11, AC-10 | Ticket Number formatting from a counter value | `42` → `TKT-2026-000042`; matches `TKT-\d{4}-\d{6}` | `ticket-number.unit.test.ts` | — |
| UNIT-02 | BR-11 | Counter above six digits | Does not truncate; format documented and stable | `ticket-number.unit.test.ts` | — |
| UNIT-03 | BR-33 | Magic-byte detection for each permitted type | JPEG/PNG/WEBP/PDF each identified from bytes alone | `file-type.unit.test.ts` | — |
| UNIT-04 | BR-33, AC-33 | Disguised file | `.png` name + `image/png` header + non-PNG bytes → rejected | `file-type.unit.test.ts` | — |
| UNIT-05 | BR-19, BR-20, BR-21 | Ticket schema trimming and bounds | Whitespace-only fails required; 150/4000 boundaries exact | `validation.unit.test.ts` | — |
| UNIT-06 | BR-22 | Removal-reason schema | Blank rejected; 200 chars accepted; 201 rejected | `validation.unit.test.ts` | — |

### API — `server/tests/lab-02/*.api.test.ts`

| Test ID | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|
| API-01 | AC-08, AC-09 | Create a valid Ticket | 201; one row saved; `status` `NEW`; `requesterId` from the header | `create-ticket.api.test.ts` | — |
| API-02 | AC-10 | Two successive creations | Both Ticket Numbers well-formed and distinct | `create-ticket.api.test.ts` | — |
| API-03 | AC-13, BR-20 | Summary over 150 chars | 400 `VALIDATION_FAILED`, `fields.summary` present | `create-ticket.api.test.ts` | — |
| API-04 | AC-14 | Missing Category or Related System | 400 naming the missing field | `create-ticket.api.test.ts` | — |
| API-05 | AC-15, BR-16 | Inactive Category referenced | 400; no Ticket created | `create-ticket.api.test.ts` | — |
| API-06 | AC-18, BR-04 | `requesterId` present in the body | 400 `REQUESTER_ID_IN_BODY`; header identity never overridden | `create-ticket.api.test.ts` | — |
| API-07 | BR-04 | Missing `X-Requester-Id` | 400 `REQUESTER_CONTEXT_MISSING` | `create-ticket.api.test.ts` | — |
| API-08 | AC-05, BR-05 | Header naming an inactive Requester | 400 `REQUESTER_INACTIVE` | `create-ticket.api.test.ts` | — |
| API-09 | AC-19 | 14 owned Tickets, default paging | 200; 10 rows; `meta` reports 14 items across 2 pages | `my-tickets.api.test.ts` | — |
| API-10 | AC-20, BR-07 | Requester B lists tickets | Requester A's Tickets absent under every parameter combination | `my-tickets.api.test.ts` | — |
| API-11 | AC-21, BR-26 | Search by Ticket Number and by Summary substring | Case-insensitive; only matches returned | `my-tickets.api.test.ts` | — |
| API-12 | AC-24, BR-27 | Category filter, and filters combined | Every returned row satisfies every active filter | `my-tickets.api.test.ts` | — |
| API-13 | AC-25, BR-28 | Sorting by `ticketNumber` ascending | Order matches; default remains `createdAt desc` | `my-tickets.api.test.ts` | — |
| API-14 | AC-28, BR-28 | Two Tickets sharing `createdAt`, paged | No Ticket on both pages, none skipped | `my-tickets.api.test.ts` | — |
| API-15 | AC-26, BR-30 | `pageSize=7`, and an unknown parameter | 400 naming the parameter; never silently clamped | `my-tickets.api.test.ts` | — |
| API-16 | AC-27, BR-29 | Page beyond the last | 200 with empty `data` and truthful `meta` | `my-tickets.api.test.ts` | — |
| API-17 | AC-29 | Fetch an owned Ticket | 200; full detail including attachment groups | `ticket-detail.api.test.ts` | — |
| API-18 | AC-30, BR-08 | Fetch another Requester's Ticket | 404, body identical to a genuinely missing id | `ticket-detail.api.test.ts` | — |
| API-19 | AC-31 | Upload a valid PNG | 201; metadata carries the original filename; storage key never exposed | `attachments.api.test.ts` | — |
| API-20 | AC-32, BR-34 | Upload a 6 MB file | 413; nothing persisted, no orphaned file | `attachments.api.test.ts` | — |
| API-21 | AC-33, BR-33 | Upload a disguised file | 415; nothing persisted | `attachments.api.test.ts` | — |
| API-22 | AC-34, AC-39, BR-35 | Sixth active upload, then remove one and retry | 409, then 201 — a removal frees a slot | `attachments.api.test.ts` | — |
| API-23 | AC-36, AC-38, BR-22 | Soft removal with and without a reason | 200 with reason recorded; 400 and still active without | `attachments.api.test.ts` | — |
| API-24 | AC-37, AC-40, BR-39 | Content of a removed Attachment, and of another Requester's | 404 in both cases | `attachments.api.test.ts` | — |
| API-25 | AC-35 | Download an active Attachment | 200; correct `Content-Type` and original filename in `Content-Disposition` | `attachments.api.test.ts` | — |
| API-26 | AC-01, BR-05 | Active Requester list | Four active returned, the inactive one absent | `requesters.api.test.ts` | — |
| API-27 | FR-16, BR-45 | Active Categories and Related Systems | Inactive rows absent; Lab 1's `{id,name}` shape preserved | `requesters.api.test.ts` | — |
| API-28 | BR-44 | Running the seed a second time | All three reference collections identical — no row added, renamed, or reordered | `requesters.api.test.ts` | — |

### UI component — `client/tests/lab-02/*.test.tsx`

| Test ID | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|
| UI-01 | AC-01 | Selector lists active Requesters | Four options; inactive name absent | `RequesterSelection.test.tsx` | — |
| UI-02 | AC-06 | Requester API failure | Error state with retry; no dropdown of stale values | `RequesterSelection.test.tsx` | — |
| UI-03 | AC-07 | No active Requesters | Empty state naming the seed command | `RequesterSelection.test.tsx` | — |
| UI-04 | AC-02, FR-04 | My Tickets without a context | Redirects to the selection screen | `AppShell.test.tsx` | — |
| UI-05 | AC-03 | Reload with a persisted selection | Context restored; no re-selection prompt | `AppShell.test.tsx` | — |
| UI-06 | AC-04, BR-09 | Change Requester | New Requester's Tickets shown; none of the previous Requester's remain | `AppShell.test.tsx` | — |
| UI-07 | AC-05 | Persisted selection now inactive | Cleared; selection screen shown | `AppShell.test.tsx` | — |
| UI-08 | AC-11, AC-12 | Submit with empty and whitespace-only Summary | Message beneath Summary; **no API call made** | `CreateTicket.test.tsx` | — |
| UI-09 | AC-16, BR-24 | Double-click Submit | Button disabled and busy; exactly one request sent | `CreateTicket.test.tsx` | — |
| UI-10 | AC-17, BR-25 | API failure on submit | Safe error state; every entered value retained | `CreateTicket.test.tsx` | — |
| UI-11 | AC-08 | Successful submission | Success panel displays the returned Ticket Number | `CreateTicket.test.tsx` | — |
| UI-12 | AC-41, BR-41 | One of two Attachments fails | Ticket Number shown; the failed file named per file | `CreateTicket.test.tsx` | — |
| UI-13 | FR-16, BR-45 | Reference data | Category and Related System options come from the API, none hard-coded | `CreateTicket.test.tsx` | — |
| UI-14 | AC-23, BR-31 | Requester with no Tickets | Empty state offering Create Ticket | `MyTickets.test.tsx` | — |
| UI-15 | AC-22, BR-31 | Filters matching nothing | No-results state offering Clear Filters, distinct from empty | `MyTickets.test.tsx` | — |
| UI-16 | FR-15 | List loading and error | Loading state, then error state with retry | `MyTickets.test.tsx` | — |
| UI-17 | AC-29 | Ticket Detail | All fields read-only; no editable control present | `RequesterTicketDetail.test.tsx` | — |
| UI-18 | AC-30 | Detail of an unowned Ticket | Not-found state; no Ticket data rendered | `RequesterTicketDetail.test.tsx` | — |
| UI-19 | AC-36, BR-39 | Removed Attachment group | Reason, remover, and time shown; no download control rendered | `AttachmentSection.test.tsx` | — |
| UI-20 | AC-38, BR-42 | Removal without a reason | Confirm disabled; Attachment stays active | `AttachmentSection.test.tsx` | — |
| UI-21 | AC-32, AC-34 | Oversized file and limit reached | Per-file rejection message; other selected files unaffected | `AttachmentSection.test.tsx` | — |

### UI style — `client/tests/lab-02/style/*.test.tsx`

| Test ID | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|
| STYLE-01 | ui-spec §3 | Required-field marking | Asterisk present **and** validation message present — asterisk never substitutes | `form-field.style.test.tsx` | — |
| STYLE-02 | ui-spec §3 | Validation message placement | Message is a sibling of its own field, `aria-describedby` linked, not a top banner | `form-field.style.test.tsx` | — |
| STYLE-03 | ui-spec §3 | Read-only vs editable | Read-only fields carry the read-only class and are not focusable inputs | `form-field.style.test.tsx` | — |
| STYLE-04 | AC-44 | Badges | Every Priority and Status badge renders its text label, not colour alone | `badge.style.test.tsx` | — |
| STYLE-05 | ui-spec §3 | Submit busy state | Spinner present, `disabled` set, accessible busy label | `button.style.test.tsx` | — |
| STYLE-06 | AC-46 | Icon-only controls | Every one exposes an accessible name | `a11y.style.test.tsx` | — |
| STYLE-07 | AC-45 | Keyboard traversal of Create Ticket | Every control reachable in visual order; form submittable by keyboard | `a11y.style.test.tsx` | — |

### Responsive and E2E — `e2e/lab-02/*.spec.ts`

| Test ID | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|
| RESP-01 | AC-42 | Three screens at 1440 px | No horizontal page scroll; no clipped or overlapping elements; screenshots written | `responsive.spec.ts` | — |
| RESP-02 | AC-42 | Three screens at 800 px | Two-column layout holds; Summary and Description keep width | `responsive.spec.ts` | — |
| RESP-03 | AC-42, AC-43 | Three screens at 375 px | My Tickets renders cards, not a scrolling table; no horizontal page scroll | `responsive.spec.ts` | — |
| RESP-04 | ui-spec §7 | Mobile navigation and filters | Toggler opens nav; filters disclosure usable; targets ≥44 px | `responsive.spec.ts` | — |
| RESP-05 | ui-spec §9 | Evidence capture | All screenshot paths in `ui-spec.md` §9 written and non-empty | `evidence.spec.ts` | — |
| E2E-01 | AC-08, AC-19 | Select Requester → create Ticket → find it in My Tickets | Confirmation shows the official number; the Ticket appears in the list | `requester-ticket-flow.spec.ts` | — |
| E2E-02 | AC-04, AC-20 | Switch from Requester A to Requester B | A's Tickets disappear entirely from the list | `requester-ticket-flow.spec.ts` | — |
| E2E-03 | AC-31, AC-35, AC-36, AC-37 | Attachment lifecycle in the browser | Upload, download, remove with reason, blocked download afterwards | `requester-ticket-flow.spec.ts` | — |
| E2E-04 | AC-17, AC-25 | API failure via route interception | Safe error state; form values preserved; captured as evidence | `evidence.spec.ts` | — |
| E2E-05 | AC-30 | Direct navigation to another Requester's Ticket URL | Not-found state; no Ticket data present in the response body | `requester-ticket-flow.spec.ts` | — |

## 3. Acceptance-Criterion Traceability

| AC | Covering tests | AC | Covering tests |
|---|---|---|---|
| AC-01 | API-26, UI-01 | AC-24 | API-12 |
| AC-02 | UI-04 | AC-25 | API-13 |
| AC-03 | UI-05 | AC-26 | API-15 |
| AC-04 | UI-06, E2E-02 | AC-27 | API-16 |
| AC-05 | API-08, UI-07 | AC-28 | API-14 |
| AC-06 | UI-02 | AC-29 | API-17, UI-17 |
| AC-07 | UI-03 | AC-30 | API-18, UI-18, E2E-05 |
| AC-08 | API-01, UI-11, E2E-01 | AC-31 | API-19, E2E-03 |
| AC-09 | API-01 | AC-32 | API-20, UI-21 |
| AC-10 | UNIT-01, API-02 | AC-33 | UNIT-04, API-21 |
| AC-11 | UI-08 | AC-34 | API-22, UI-21 |
| AC-12 | UNIT-05, UI-08 | AC-35 | API-25, E2E-03 |
| AC-13 | UNIT-05, API-03 | AC-36 | API-23, UI-19, E2E-03 |
| AC-14 | API-04 | AC-37 | API-24, E2E-03 |
| AC-15 | API-05 | AC-38 | UNIT-06, API-23, UI-20 |
| AC-16 | UI-09 | AC-39 | API-22 |
| AC-17 | UI-10, E2E-04 | AC-40 | API-24 |
| AC-18 | API-06 | AC-41 | UI-12 |
| AC-19 | API-09, E2E-01 | AC-42 | RESP-01, RESP-02, RESP-03 |
| AC-20 | API-10, E2E-02 | AC-43 | RESP-03 |
| AC-21 | API-11 | AC-44 | STYLE-04 |
| AC-22 | UI-15 | AC-45 | STYLE-07 |
| AC-23 | UI-14 | AC-46 | STYLE-06 |

Every AC-01 to AC-46 appears above. No planned test exists without a criterion behind it.
API-28 is the one test answering to a behaviour rule rather than a criterion — BR-44's
idempotent seed has no acceptance criterion of its own, only a Definition-of-Done item.

## 4. Responsive and Visual Checklist

The checklist in [`ui-spec.md`](./ui-spec.md) §8 is executed against the screenshots at
`artifacts/lab-02/screenshots/` (§9 of that document), which are **generated by Playwright
and committed**, not captured by hand. Regenerate with `pnpm test:e2e`.

Manual capture is reserved for what lives outside the application: the GitHub Project
Kanban board, the commit graph, and the IDE directory tree.

## 5. Test Commands

```bash
pnpm db:up                      # PostgreSQL 17 via Docker
pnpm db:migrate && pnpm db:seed # development database
pnpm test                       # unit + API + UI + style — all packages
pnpm --filter server test       # API and unit only
pnpm --filter client test       # UI and style only
pnpm test:e2e                   # Playwright: responsive, E2E, evidence capture
```

`pnpm test` deliberately excludes Playwright (D-14): a browser-download failure must never
be able to turn the Definition-of-Done test run red.

## 6. Final Results

Filled in on the release PR from `lab2-staging` to `main`, from a run against `main`.

| Level | Planned | Passing | Skipped |
|---|---|---|---|
| Unit | 6 | — | — |
| API | 28 | — | — |
| UI | 21 | — | — |
| Style | 7 | — | — |
| Responsive | 5 | — | — |
| E2E | 5 | — | — |
| **Total** | **72** | — | — |

## 7. Known Limitations and Deferred Tests

- **The Development Requester header is spoofable**, so no test asserts that identity
  cannot be forged — it can. The tests assert that ownership is *checked server-side*
  against whatever identity arrives, which is what must survive into Lab 3.
- **No load or concurrency testing.** Ticket Number uniqueness is proven by the unique
  constraint and by API-02, not by concurrent creation under load.
- **No cross-browser matrix.** Playwright runs Chromium only; the responsive evidence is a
  layout check, not a browser-compatibility claim.
- **No test for a missing file on disk** whose metadata row still exists (ADR-0004
  consequence). The route handles it as a 404; reproducing it would require reaching past
  the API to delete a file, which the API deliberately offers no way to do.
- **Authentication, IT Staff workflow, comments, and status transitions are untested**
  because they are unimplemented and out of scope.
