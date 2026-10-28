# Lab 4 Test Plan and Traceability

Authoritative test plan planned from [`specification.md`](./specification.md)
**before** implementation, adhering to Test-Driven Development (TDD) and Spec-DD.
Every acceptance criterion maps to at least one planned automated test. Every planned
test names its exact file path and expected outcome. Test IDs restart for Lab 4 and
are disambiguated by directory.

---

## 1. Testing Strategy and Seams

Lab 4 reuses the six seams proven in Lab 3 — no new seam is introduced:

| Level | Identifier | Purpose | Technology |
| --- | --- | --- | --- |
| **Unit** | `UNIT-nn` | Pure validation and matrix logic: action fields, final status matrix, metric boundary helpers. | Vitest |
| **API** | `API-nn` | HTTP contract, RBAC, ownership, conflicts, dashboard calculations, seed/migration behavior. | Vitest + Supertest |
| **UI Component** | `UI-nn` | Dashboard cards, Actions Taken flows, workflow feedback, conflict preservation. | Vitest + Testing Library |
| **UI Style** | `STYLE-nn` | Zen Green tokens, no inline hex, colour+text pairing. | Vitest + Testing Library |
| **Responsive** | `RESP-nn` | Desktop, tablet, mobile (390 px) layouts with no clipping or overflow. | Playwright |
| **E2E** | `E2E-nn` | Full multi-role journeys in headless Chromium. | Playwright |

### Seam Decisions

- **HTTP is the authorization seam.** Every role restriction is asserted by calling
  the API directly with each role's session; no test proves authorization by hiding
  a button.
- **Dashboard calculations are asserted against direct database queries** in the same
  test (count via Prisma, then compare to the endpoint), so a metric cannot drift.
- **Concurrency is asserted with two writers and one `expectedVersion`**, proving the
  conditional update rather than trusting UI disabling.
- **Workflow is asserted twice**: once against the pure matrix (`UNIT-02`) and once
  through the endpoint (`API-10`), so a UI-only change cannot satisfy it.

### Database Isolation

The `toktickit_test` database strategy from Lab 3 continues, with two additions:

1. **Truncation order** includes the new table: `ActionTaken`, then `InternalNote`,
   `Comment`, `Attachment`, then `Ticket`. `User`, `Category`, and `RelatedSystem`
   remain preserved between tests.
2. **E2E cleanup re-seeds the demo baseline**: `cleanup-e2e` deletes Actions Taken
   before Tickets, then re-runs the full demo seed (reference data, users, demo
   Tickets, and their actions), because the seed is now transactional (D-27,
   BR-26).

---

## 2. Planned Tests

### Unit — `server/tests/lab-04/*.unit.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result | File |
| --- | --- | --- | --- | --- |
| UNIT-01 | AC-03, BR-04, BR-05, BR-06 | Action Taken validation: required description/result, trimming, 2,000/1,000 bounds, follow-up-note conditional in both directions | Valid payload accepted; each invalid variant names its field | `actions-taken.unit.test.ts` |
| UNIT-02 | AC-09, BR-15, BR-16 | Final matrix: every permitted edge accepted; invalid, same-status, and post-`CANCELLED` edges rejected | `isValidStatusTransition` returns true/false exactly per matrix; `CANCELLED` has no outgoing edge | `status-matrix.unit.test.ts` |
| UNIT-03 | AC-12, AC-13, BR-21, BR-22 | Metric boundary helpers: open-status set, recently-updated ordering, zero-data behavior | Sets and ordering match the documented definitions; zero input yields zeros/empty | `dashboard-metrics.unit.test.ts` |

### API — `server/tests/lab-04/*.api.test.ts`

#### `actions-taken.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-01 | AC-01, BR-01, BR-03 | Valid staff create | `201`; row under the correct Ticket; `performedBy` equals the session user |
| API-02 | AC-03, BR-04 | Follow-up omitted while required; note sent while not required | `400 VALIDATION_FAILED` with `followUpNote` field error in both directions |
| API-03 | AC-05, BR-10 | Requester create and update attempts | `403 FORBIDDEN`; no row created or changed |
| API-04 | AC-04, BR-09 | Owner Requester lists actions; unrelated Requester lists same Ticket | `200` ascending for the owner; `404 TICKET_NOT_FOUND` for the other |
| API-05 | AC-02, BR-03 | Update description/result/follow-up; attempt to change `performedBy` | `200`; changed fields persist; performer and `createdAt` unchanged; supplied `performedBy` rejected |
| API-06 | AC-06 | Unknown action id, and an action id belonging to another Ticket | `404 ACTION_TAKEN_NOT_FOUND` |
| API-07 | AC-07, BR-13 | Two creates with the same `expectedVersion` (sequential) | First `201`; second `409 STALE_UPDATE`; exactly one row exists |

#### `ticket-workflow.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-08 | AC-08, BR-12 | Stale update on status, owner, and priority | Each answers `409 STALE_UPDATE`; Ticket fields unchanged |
| API-09 | AC-08, BR-11 | Successful mutation responses | New `version` returned and incremented by exactly one |
| API-10 | AC-09, BR-15, BR-16 | Matrix through the endpoint: permitted edge, invalid edge, same-status, post-`CANCELLED` | `200` / `400 INVALID_STATUS_TRANSITION` respectively |
| API-11 | AC-10, BR-15 | `GET /api/staff/tickets/:id` payload | Contains `version` and `permittedTransitions` equal to the matrix for the current status |
| API-12 | AC-11, BR-18 | Requester resolve-indication on an `OPEN` Ticket | `200`; `resolvedByRequester: true`; status unchanged; version bumped |
| API-13 | AC-23, BR-20 | Administrator claims, prioritises, transitions, and records an action | All succeed, superseding ADR-0008 in the ticket direction only |
| API-14 | AC-23 | IT Staff calls `GET /api/admin/users` | `403 FORBIDDEN` |
| API-15 | AC-11, BR-17 | Requester calls `PATCH /api/staff/tickets/:id/status` | `403 FORBIDDEN` |

#### `requester-dashboard.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-16 | AC-12, BR-23 | Metrics for a Requester with seeded Tickets | Counts and lists equal direct queries scoped to that Requester only |
| API-17 | AC-16, BR-24 | Requester with no Tickets | `200` with zero counts and empty arrays |
| API-18 | AC-17 | IT Staff and Administrator call the Requester dashboard | `403 FORBIDDEN` |
| API-19 | AC-15, BR-25 | Each documented drill-down query against `/api/tickets` | Returned set matches the originating metric |

#### `staff-dashboard.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-20 | AC-13, BR-21 | Unassigned, owned-by-me, all eight status counts, all four priority counts, recent list | Every value equals a direct database count; recent list capped at five, `updatedAt` desc |
| API-21 | AC-14, BR-20 | Administrator and IT Staff dashboard payloads | Admin receives `userCounts` (total/active/inactive/byRole); Staff response omits it |
| API-22 | AC-21, BR-26 | Seed run twice on a seeded database | No duplicates for Users, Tickets, or Actions Taken; counts unchanged |
| API-23 | AC-21, BR-27 | Migration against a Lab 3 database shape including a zero-action Ticket | Legacy Ticket reads, dashboards, and detail remain valid |
| API-24 | AC-13 | Performance smoke: staff dashboard against the full demo dataset | Responds `200` within 500 ms on the local test database |
| API-25 | AC-26, BR-28 | Forced stale update and missing action through the error envelope | Envelope shape with safe messages; no stack, SQL, or path |
| API-26 | AC-22, BR-30 | `GET /api/requesters` after retirement | Standard 404; no user list leaked |

### UI Component — `client/tests/lab-04/*.test.tsx`

| Test ID | AC / BR | What It Tests | Expected Result | File |
| --- | --- | --- | --- | --- |
| UI-01 | AC-13, AC-15 | Staff dashboard renders metric cards, status/priority grids, and drill links | All eight status cards render, values shown as text, links carry the documented query parameters | `StaffDashboard.test.tsx` |
| UI-02 | AC-12, AC-16 | Requester dashboard renders own counts/lists and the empty state | Counts render; no other Requester data appears; zero data shows empty copy | `RequesterDashboard.test.tsx` |
| UI-03 | AC-14, AC-17, AC-26 | Dashboard loading, error, forbidden, and partial-failure states | Skeleton while loading; retry on error; forbidden state without retry loop; failed account counts do not blank ticket metrics | `StaffDashboard.test.tsx` |
| UI-04 | AC-01, AC-03, AC-18 | Actions Taken create form: conditional follow-up, counters, validation placement | Note hidden until switch on; required error when on and empty; counters update | `ActionsTaken.test.tsx` |
| UI-05 | AC-02, AC-18 | Edit mode shows read-only Performed by / Action Date/Time and saves edits | Read-only fields have no editable affordance; edits submit and list refreshes | `ActionsTaken.test.tsx` |
| UI-06 | AC-18, FR-19 | Rapid double submit | Submit disabled in flight; one request observed | `ActionsTaken.test.tsx` |
| UI-07 | AC-19 | Requester Ticket Detail with actions | All actions render; no create/edit controls exist in the DOM | `ActionsTaken.test.tsx` |
| UI-08 | AC-10, FR-07 | Status control renders only `permittedTransitions`; success refreshes badge; `CANCELLED` read-only | Options equal payload; no extra statuses; cancelled state explains and disables | `TicketWorkflow.test.tsx` |
| UI-09 | AC-20, FR-20 | `409` during an action edit | Conflict alert appears, entered text preserved, reload control present | `TicketWorkflow.test.tsx` |
| UI-10 | AC-24, FR-16 | Role navigation includes Dashboard with active indication | Each role sees its destinations; active item carries `aria-current="page"` | `StaffDashboard.test.tsx` |

### UI Style — `client/tests/lab-04/style/*.test.tsx`

| Test ID | AC / BR | What It Tests | Expected Result | File |
| --- | --- | --- | --- | --- |
| STYLE-01 | BR-32 | Metric cards and Actions Taken panels use theme classes; no inline hex anywhere in new components | Only `var(--zen-*)` and Bootstrap utilities; hex scan clean | `dashboard.style.test.tsx` |
| STYLE-02 | AC-24 | Follow-up and conflict states pair colour with text | "Required"/"Conflict" text present alongside colour classes | `actions.style.test.tsx` |
| STYLE-03 | AC-24 | Status/priority badges in dashboard grids remain text-labelled | Every badge announces its label | `dashboard.style.test.tsx` |

### Responsive — `e2e/lab-04/responsive.spec.ts`

| Test ID | Viewport | What It Tests | Expected Result |
| --- | --- | --- | --- |
| RESP-01 | 1280 px | Both dashboards and staff Ticket Detail with actions | No clipping, overlap, or horizontal scroll |
| RESP-02 | 768 px | Dashboards condense to two columns; tables condense | No horizontal overflow; controls reachable |
| RESP-03 | 390 px | Dashboards stack; Actions Taken become cards | Touch targets ≥ 44 px; no horizontal page scroll |
| RESP-04 | 390 px | Action editor create/edit and conflict alert | Fields full width; alert readable without zoom |

### End-to-End — `e2e/lab-04/*.spec.ts`

| Test ID | AC Trace | Journey | File |
| --- | --- | --- | --- |
| E2E-01 | AC-01, AC-02, AC-03, AC-07, AC-18 | Staff opens a Ticket, records an action with follow-up, edits it, double-submits, and sees one row | `actions-taken-flow.spec.ts` |
| E2E-02 | AC-09, AC-10, AC-11, AC-23 | Requester indicates resolved; Admin transitions the Ticket through resolution and closure; Requester sees the outcome | `ticket-resolution.spec.ts` |
| E2E-03 | AC-12, AC-13, AC-14, AC-15, AC-16 | Requester, Staff, and Admin load dashboards, follow a metric to the matching list, and see the empty state for a zero-data Requester | `dashboards.spec.ts` |

---

## 3. Acceptance-Criterion Traceability

| AC | Planned Tests | Levels |
| --- | --- | --- |
| AC-01 | API-01, UI-04, E2E-01 | API + UI + E2E |
| AC-02 | API-05, UI-05, E2E-01 | API + UI + E2E |
| AC-03 | UNIT-01, API-02, UI-04, E2E-01 | Unit + API + UI + E2E |
| AC-04 | API-04 | API |
| AC-05 | API-03 | API |
| AC-06 | API-06 | API |
| AC-07 | API-07, E2E-01 | API + E2E |
| AC-08 | API-08, API-09 | API |
| AC-09 | UNIT-02, API-10, E2E-02 | Unit + API + E2E |
| AC-10 | API-11, UI-08, E2E-02 | API + UI + E2E |
| AC-11 | API-12, E2E-02 | API + E2E |
| AC-12 | UNIT-03, API-16, UI-02, E2E-03 | Unit + API + UI + E2E |
| AC-13 | UNIT-03, API-20, API-24, UI-01, E2E-03 | Unit + API + UI + E2E |
| AC-14 | API-21, UI-03, E2E-03 | API + UI + E2E |
| AC-15 | API-19, UI-01, E2E-03 | API + UI + E2E |
| AC-16 | API-17, UI-02, E2E-03 | API + UI + E2E |
| AC-17 | API-18, UI-03 | API + UI |
| AC-18 | UI-04, UI-05, UI-06, E2E-01 | UI + E2E |
| AC-19 | UI-07 | UI |
| AC-20 | UI-09, RESP-04 | UI + Responsive |
| AC-21 | API-22, API-23 | API |
| AC-22 | API-26 + full regression run | API + all suites |
| AC-23 | API-13, API-14, E2E-02 | API + E2E |
| AC-24 | UI-10, STYLE-02, STYLE-03, RESP-01..04 | UI + Style + Responsive |
| AC-25 | RESP-01..04 | Responsive |
| AC-26 | API-25, UI-03 | API + UI |

---

## 4. Regression Coverage (Labs 1–3)

The Lab 4 Definition of Done requires the complete earlier suites to run after the
migration:

- **Lab 1**: `server/tests/lab-01`, `client/tests/lab-01` — health, categories, the
  Check System screen.
- **Lab 2**: `server/tests/lab-02`, `client/tests/lab-02`, `e2e/lab-02` — ticket
  creation, My Tickets, detail, attachments, soft removal.
- **Lab 3**: `server/tests/lab-03`, `client/tests/lab-03`, `e2e/lab-03` —
  authentication, password change, RBAC, queue, ticket operations, comments, notes,
  user management.

No Lab 1–3 test may be skipped or weakened to make Lab 4 pass. The only permitted
edits are the Development Requester retirement updates below.

---

## 5. Planned Development Requester Retirement Updates

D-28 removes `/select-requester` and `/api/requesters`. Affected evidence:

| Test | Change | Why it is not a regression |
| --- | --- | --- |
| `e2e/lab-02/*.spec.ts` journeys that begin at `/select-requester` | Replace selector step with login as the seeded Requester | The assertions about creating, listing, and managing Tickets are unchanged; identity is now real, as Lab 3 requires |
| Any API test calling `GET /api/requesters` | Deleted, replaced by API-26 asserting the endpoint is gone | The endpoint populated a retired screen; its removal is the asserted behavior |
| `client/tests/lab-02` RequesterSelection tests | Removed with the screen | The screen no longer exists; ticket UI coverage remains |

All other Lab 2 assertions (tickets, attachments, validation, ownership) stay.

---

## 6. Test Commands

```bash
# Unit + API + UI + style
pnpm test

# One package
pnpm --filter server test
pnpm --filter client test

# One file
pnpm --filter server test tests/lab-04/actions-taken.api.test.ts

# E2E (Lab 4 only, then everything)
pnpm test:e2e:lab4
pnpm test:e2e

# Typecheck and build
pnpm typecheck
pnpm build
```

A `test:e2e:lab4` script is added alongside the existing `test:e2e:lab3` /
`test:e2e:lab2` scripts.

---

## 7. Final Results

Filled in by the release ticket after implementation; planned counts:

| Level | Planned | Passing | Skipped | Status |
| --- | --- | --- | --- | --- |
| Unit | 3 | — | — | Planned |
| API | 26 | — | — | Planned |
| UI Component | 10 | — | — | Planned |
| UI Style | 3 | — | — | Planned |
| Responsive | 4 | — | — | Planned |
| E2E | 3 | — | — | Planned |
| **Total** | **49** | — | — | Planned |

Known limitations to carry into the release evidence:

- Chromium-only Playwright matrix, as in Labs 2–3.
- No notification delivery by design (handout §4.2).
- Screenshots are committed evidence, not a cross-browser guarantee.
