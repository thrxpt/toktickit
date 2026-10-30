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
- **Concurrency is asserted with two writers and one `expectedVersion`**, both
  concurrently and sequentially (API-07). Failed ActionTaken writes leave the
  Ticket version and action unchanged (API-27), proving transaction rollback
  rather than trusting UI disabling.
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
| API-01 | AC-01, BR-01, BR-03 | Valid staff create | `201`; row under the correct Ticket; `performedBy` equals the session user; internal `seedKey` absent from responses |
| API-02 | AC-03, BR-04 | Follow-up omitted while required; note sent while not required | `400 VALIDATION_FAILED` with `followUpNote` field error in both directions |
| API-03 | AC-05, BR-10 | Requester create and update attempts | `403 FORBIDDEN`; no row created or changed |
| API-04 | AC-04, BR-09 | Owner Requester lists actions; unrelated Requester lists same Ticket | `200` ascending for the owner; `404 TICKET_NOT_FOUND` for the other |
| API-05 | AC-02, BR-03, BR-26 | Update description/result/follow-up; attempt to change `performedBy` or supply seed-only `seedKey` on create/update | `200` for valid update; performer and `createdAt` unchanged; supplied `performedBy`/`seedKey` rejected; internal seed keys absent from read/update responses |
| API-06 | AC-06 | Unknown action id, and an action id belonging to another Ticket | `404 ACTION_TAKEN_NOT_FOUND` |
| API-07 | AC-07, BR-12, BR-13 | Two creates with the same `expectedVersion`, once concurrently and once sequentially | One `201`, one `409 STALE_UPDATE`; exactly one new action row and one Ticket version increment in each schedule |
| API-27 | AC-07, AC-26, BR-12, BR-13 | Force an ActionTaken insert/update failure inside the database transaction after the conditional Ticket write | Safe error response; persisted action data and Ticket version both equal their pre-request values; retry with the original version can succeed |

#### Issue 23 implementation — `ticket-version.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-08, API-09 | AC-08, BR-11, BR-12 | Existing owner, priority, status, and resolution endpoints: current/stale/invalid versions; simultaneous writers including mixed operations | Success increments once; stale writes return safe `409 STALE_UPDATE`; missing/negative/fractional/string/null versions return field errors without writes |
| API-09 | AC-08, BR-11 | Ticket creation, Requester detail/list, Staff detail/queue; Public Comments and Internal Notes | All Ticket payloads carry `version`; discussion writes leave it unchanged |
| API-12 | AC-08, AC-11, BR-11, BR-12, BR-18 | Resolution indication on an `OPEN` Ticket followed by a Staff write with the old version | Indication increments version without changing status; Staff write returns `409` |

The existing-operation portions of API-08/API-09/API-12 land in Issue 23. Actions
Taken portions remain with Issue 24; lifecycle and operational-role rows below
remain planned for the corresponding later Issues.

#### Issue 24 implementation — Actions Taken foundation

Implemented: `actions-taken.unit.test.ts` (UNIT-01),
`actions-taken.api.test.ts` (API-01–API-07, API-27; action stale updates for API-09),
`seed.api.test.ts` (API-22; API-23 cleanup/truncation baseline), and
`actions-migration.api.test.ts` (API-23 additive ActionTaken migration, nullable
unique seed keys, legacy Ticket preservation and reverse in an isolated schema).
API-23 cleanup also covers ordinary actions added to demo Tickets by temporary
E2E performers, ensuring their restrictive foreign keys do not block account
cleanup. API-23 dashboard indexes remain with Issue 27. API-22's implementation lives in
`seed.api.test.ts` rather than the planned dashboard test file so this foundation
can be verified independently. Rollback failures are induced with a temporary
CHECK constraint in the test database, exercising real transaction rollback.

Issue 24 verification (2026-10-30): `pnpm build`, `pnpm typecheck`, and
`pnpm --filter server exec tsc --noEmit` passed. The full suite passed with
`NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 296 server tests and
149 client tests, zero skips. The flag avoids the host Node runtime's experimental
localStorage conflicting with jsdom. Tests used an isolated database ending in
`_test`. Standards review reported no findings; the Spec review's E2E cleanup
finding was reproduced and fixed with regression coverage.

#### `ticket-workflow.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-08 | AC-08, BR-12 | Stale update on status, owner, priority, Requester resolution indication, and Action Taken update | Each answers `409 STALE_UPDATE`; Ticket fields/version and action unchanged |
| API-09 | AC-08, BR-11, BR-12 | Successful mutation responses and missing/negative/non-integer versions on every guarded endpoint | Success returns `ticketVersion` incremented by exactly one; invalid versions answer `400 VALIDATION_FAILED` without writes |
| API-10 | AC-09, BR-15, BR-16 | Matrix through the endpoint: permitted edge, invalid edge, same-status, post-`CANCELLED` | `200` / `400 INVALID_STATUS_TRANSITION` respectively |
| API-11 | AC-10, BR-15 | `GET /api/staff/tickets/:id` payload | Contains `version` and `permittedTransitions` equal to the matrix for the current status |
| API-12 | AC-08, AC-11, BR-11, BR-12, BR-18 | Owning Requester sends current `expectedVersion` on an `OPEN` Ticket; Staff then writes with the pre-indication version | Indication answers `200`, returns incremented `ticketVersion`, sets `resolvedByRequester: true`, and leaves status unchanged; the Staff write answers `409 STALE_UPDATE` and changes nothing |
| API-13 | AC-23, BR-20 | Administrator claims, prioritises, transitions, and records an action | All succeed, superseding ADR-0008 in the ticket direction only |
| API-14 | AC-23 | IT Staff calls `GET /api/admin/users` | `403 FORBIDDEN` |
| API-15 | AC-11, BR-17 | Requester calls `PATCH /api/staff/tickets/:id/status` | `403 FORBIDDEN` |

#### `requester-dashboard.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-16 | AC-12, BR-23 | Metrics for a Requester with seeded Tickets | Counts and lists equal direct queries scoped to that Requester only |
| API-17 | AC-16, BR-24 | Requester with no Tickets | `200` with zero counts and empty arrays |
| API-18 | AC-17 | IT Staff and Administrator call the Requester dashboard | `403 FORBIDDEN` |
| API-19 | AC-15, BR-25 | Each Requester drill-down against `/api/tickets`, including `sort=updatedAt&order=desc`; invalid/empty/repeated `statusGroup` and `status` plus `statusGroup` | Valid queries return the matching collection in documented order; invalid group or conflicting filters answer `400 INVALID_QUERY_PARAMETER` |

#### `staff-dashboard.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-20 | AC-13, BR-21 | Unassigned, owned-by-me, all eight status counts, all four priority counts, recent list | Every value equals a direct database count; recent list capped at five, `updatedAt` desc |
| API-21 | AC-14, BR-20 | Administrator and IT Staff dashboard payloads | Admin receives `userCounts` (total/active/inactive/byRole); Staff response omits it |
| API-22 | AC-21, BR-26 | Seed run twice: demo Tickets upsert by stable Ticket Number, Actions Taken by stable unique `seedKey`; two actions on one Ticket share a description | Counts and fixture ids unchanged; same-description actions remain separate; ordinary actions allow null seed keys; zero/one/many coverage remains |
| API-23 | AC-21, BR-27 | Migrations applied to a Lab 3 database, reversed on the test database, plus harness baseline | Legacy rows and zero-action Tickets valid; nullable unique `seedKey` and both dashboard `updatedAt` indexes exist; down-migrations restore the schema; truncation deletes ActionTaken before Ticket; E2E cleanup restores the full demo baseline |
| API-24 | AC-13 | Performance smoke: staff dashboard against the full demo dataset | Responds `200` within a generous 500 ms local budget (single retry before failing) |
| API-25 | AC-26, BR-28 | Forced stale update and missing action through the error envelope | Envelope shape with safe messages; no stack, SQL, or path |
| API-26 | AC-22, BR-30 | `GET /api/requesters` after retirement | Standard 404; no user list leaked |

#### `requester-retirement.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result |
| --- | --- | --- | --- |
| API-28 | AC-22, BR-29, BR-30 | Header-only Ticket list/create and attachment-content access with Requester/IT Staff/Administrator ids; no session; expired session plus header; valid session plus a conflicting header | No valid session always answers `401 UNAUTHENTICATED`, including ticket creation; no rows created or bytes returned. With a valid session, identity/role comes only from that session, ownership is enforced, and a header cannot turn Staff/Admin into a Requester |

### Regression Suite Execution

| Test ID | AC / BR | What It Runs | Expected Result |
| --- | --- | --- | --- |
| REG-01 | AC-22, BR-31 | All Lab 1–3 unit, API, UI, style, responsive, and E2E suites on `lab4-staging` after migration and seed changes | Every suite green with only the contract updates in §5; obsolete tests are documented deletions with replacement coverage; zero skips |

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
| UI-09 | AC-08, AC-20, FR-06, FR-20 | Issue 23: Staff edit and Requester indication conflict/reload/retry, successful mutation version reuse, and unsent discussion text; Issue 25 adds Action Taken edits | Conflict alert appears; pending choice and text survive reload; retry sends refreshed `expectedVersion`; later edits use returned `ticketVersion` | `TicketWorkflow.test.tsx` |
| UI-10 | AC-24, FR-16 | Role navigation includes Dashboard with active indication | Each role sees its destinations; active item carries `aria-current="page"` | `StaffDashboard.test.tsx` |
| UI-11 | AC-12, AC-15, BR-25 | Follow Requester cards/recent-list links into My Tickets; paginate and choose a single status | Links use `statusGroup` and `sort`/`order`; My Tickets forwards them to the API, retains them on pagination, and clears the group when a single status is chosen | `RequesterDashboard.test.tsx` |
| UI-12 | AC-14, AC-15 | Follow Admin Total/per-role Accounts cards into User Management, then navigate between roles and back to Total | Total links to `/admin/users`; role links use `/admin/users?role=<ROLE>`; URL role changes update the selected filter and API request; Active/Inactive counts have no links | `StaffDashboard.test.tsx` |

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
| E2E-03 | AC-12, AC-13, AC-14, AC-15, AC-16 | Requester, Staff, and Admin load dashboards; Requester follows grouped-status/recent-update links, Admin follows Total/per-role account links; destinations apply the filters/order; zero-data Requester sees empty state | `dashboards.spec.ts` |

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
| AC-07 | API-07, API-27, E2E-01 | API + E2E |
| AC-08 | API-08, API-09, API-12, UI-09 | API + UI |
| AC-09 | UNIT-02, API-10, E2E-02 | Unit + API + E2E |
| AC-10 | API-11, UI-08, E2E-02 | API + UI + E2E |
| AC-11 | API-12, E2E-02 | API + E2E |
| AC-12 | UNIT-03, API-16, UI-02, UI-11, E2E-03 | Unit + API + UI + E2E |
| AC-13 | UNIT-03, API-20, API-24, UI-01, E2E-03 | Unit + API + UI + E2E |
| AC-14 | API-21, UI-03, UI-12, E2E-03 | API + UI + E2E |
| AC-15 | API-19, UI-01, UI-11, UI-12, E2E-03 | API + UI + E2E |
| AC-16 | API-17, UI-02, E2E-03 | API + UI + E2E |
| AC-17 | API-18, UI-03 | API + UI |
| AC-18 | UI-04, UI-05, UI-06, E2E-01 | UI + E2E |
| AC-19 | UI-07 | UI |
| AC-20 | UI-09, RESP-04 | UI + Responsive |
| AC-21 | API-22, API-23 | API |
| AC-22 | API-26, API-28, REG-01 | API + full regression |
| AC-23 | API-13, API-14, E2E-02 | API + E2E |
| AC-24 | UI-10, STYLE-02, STYLE-03, RESP-01..04 | UI + Style + Responsive |
| AC-25 | RESP-01..04 | Responsive |
| AC-26 | API-25, API-27, UI-03 | API + UI |

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

No Lab 1–3 test may be skipped or weakened to make Lab 4 pass. The permitted
contract updates are listed below; obsolete tests are deletions with replacement
coverage, not skips. Ticket, ownership, validation, and attachment assertions stay.

---

## 5. Planned Regression Updates for the Lab 4 Contract

D-28 removes `/select-requester`, `/api/requesters`, and `X-Requester-Id` identity
in all environments, including tests; there is no `NODE_ENV` bypass (FR-22, BR-30).
These implementation changes belong to Issue 28; the header-only rejection is
proved by API-28 and the retired endpoint by API-26. This docs-only Issue records
the plan before those changes are made.

### Retirement Inventory

| Module | Required change | Evidence |
| --- | --- | --- |
| `server/src/middleware/requester-context.ts` | Remove header fallback and unauthenticated-create exception; derive Requester identity/role from the session | API-28; migrated Lab 2 requester-context tests |
| `server/src/routes/attachments.ts` | Remove the separate header fallback on attachment content; preserve authorized session downloads and ownership checks | API-28; migrated Lab 2 attachment tests |
| `client/src/context/RequesterContext.tsx` | Remove `RequesterProvider`, `RequesterContext`, `useRequester`, and `STORAGE_KEY`; stop the mount-time `/api/requesters` fetch | Lab 2/3 route and shell tests verify no selector fetch or stored identity use |
| `client/src/api/client.ts` | Remove `X-Requester-Id` injection from `toktickit_requester_id`; retain cookie credentials | Lab 2/3 route and Requester page tests |
| `client/src/App.tsx`, `client/src/pages/RequesterSelection.tsx`, `client/src/components/AppShell.tsx` | Remove selector route/page/link and provider wrapper | Updated `AppRoutes.test.tsx` / `AppShell.test.tsx`; selector-only test deleted |
| `client/src/routes/RequireAuth.tsx`, `client/src/routes/RequireRole.tsx`, `client/src/components/RequesterGuard.tsx` | Remove selector redirects and legacy identity branches; use session login/forbidden behavior, removing the obsolete guard if unused | Lab 2/3 route tests retain unauthenticated and cross-role assertions |
| `client/src/pages/CreateTicket.tsx`, `MyTickets.tsx`, `RequesterTicketDetail.tsx` | Replace selected-Requester fallback with authenticated session context | Existing page tests retain creation/list/detail assertions |
| `client/src/auth/AuthContext.tsx` | Remove any remaining provider dependencies; discard legacy `toktickit_requester_id` without ever reading it as identity | Existing auth/logout tests; stale localStorage never authenticates |

### Legacy Evidence Updates

| Test | Change | Why it is not a regression |
| --- | --- | --- |
| `server/tests/lab-02/{create-ticket,my-tickets,ticket-detail,attachments}.api.test.ts` | Replace header identity setup with login/session helpers for seeded Requesters; retain all Ticket/Attachment/validation/ownership assertions | The same protected operations are exercised with trustworthy identity |
| `server/tests/lab-02/requester-context.api.test.ts` | Replace header-format/missing/inactive-identity expectations with session-only, inactive-user, cross-role, and header-impersonation rejection cases; unauthenticated creation now expects `401` | Obsolete header semantics are replaced by BR-30 coverage, including API-28 |
| `server/tests/lab-02/requesters.api.test.ts` | Delete endpoint-list tests; API-26 proves standard 404 | The endpoint populated the retired selector |
| `client/tests/lab-02/RequesterSelection.test.tsx` | Delete with the retired screen | Updated route/shell tests prove no selector route/link/fetch remains |
| `client/tests/lab-02/{AppRoutes,AppShell,CreateTicket,MyTickets,RequesterTicketDetail,AttachmentSection}.test.tsx` and affected `style/*.test.tsx` | Replace RequesterProvider/storage fixtures with authenticated context; replace selector redirects/links with login or role-forbidden expectations | Ticket UI, ownership, validation, attachment, theme, and accessibility assertions remain |
| `client/tests/lab-03/{AppRoutes,AppShell,Login,ChangePassword,RequesterTicketDetail}.test.tsx` | Remove legacy provider fixtures or selector expectations wherever present; retain session/password-change/RBAC coverage | Retires compatibility scaffolding without weakening real authentication |
| `e2e/lab-02/{helpers.ts,requester-ticket-flow.spec.ts,evidence.spec.ts,responsive.spec.ts}` | Replace selector steps with seeded-Requester login; preserve journey, viewport, and screenshot assertions | Ticket behavior stays covered under authenticated identity |

The five header-using Lab 2 API files above contain 73 `X-Requester-Id` occurrences
at the reviewed baseline `4b47ce7`; the count is an inventory aid, not a target to
preserve. Tests must run against the same session-only middleware as the app.

### Version, Role, and Dashboard Contract Updates

BR-12 and ADR-0010 deliberately amend earlier behavior; these are additional named
exceptions to unchanged legacy evidence (BR-31), not authorization to weaken it:

- Lab 2/3 API and E2E tests mutating owner, priority, status, or resolution
  indication fetch the current Ticket version and send `expectedVersion`.
  Requester detail UI mocks include `version` and assert its submission. Stale
  assertions are added through API-08, API-09, API-12, and UI-09.
- Lab 3 API/UI/E2E cases asserting Administrator exclusion from staff ticket routes
  or attachment content become permitted-operation assertions (API-13, AC-23).
  IT Staff exclusion from User Management and Requester ownership/role assertions
  remain mandatory (API-14, API-15, API-28).
- Existing route/shell/login tests adopt `/dashboard` as the post-login landing
  destination for each role, preserving original login, password-change, and
  role-boundary checks (UI-10). Dashboard drill-down changes to My Tickets and
  User Management are covered by API-19, UI-11, UI-12, and E2E-03.

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
| API | 28 | — | — | Planned |
| UI Component | 12 | — | — | Planned |
| UI Style | 3 | — | — | Planned |
| Responsive | 4 | — | — | Planned |
| E2E | 3 | — | — | Planned |
| Regression suite | 1 | — | — | Planned |
| **Total** | **54** | — | — | Planned |

Known limitations to carry into the release evidence:

- Chromium-only Playwright matrix, as in Labs 2–3.
- No notification delivery by design (handout §4.2).
- Screenshots are committed evidence, not a cross-browser guarantee.

### Issue 27 implementation evidence (#54)

The dashboard test seams are the HTTP endpoints, rendered pages with URL
navigation, and the headless Chromium journey. Metric boundaries are exercised
through the HTTP seam rather than a separate client-side metric helper (FR-15).

| Coverage | Implementation |
| --- | --- |
| API-16–API-19 | `server/tests/lab-04/requester-dashboard.api.test.ts`: session isolation including forged identity header, open/resolved boundaries, five-row recent ordering, zeros, RBAC, invalid/conflicting groups, full drill-down collections |
| API-20, API-21, API-24, API-25 | `server/tests/lab-04/staff-dashboard.api.test.ts`: owner/status/priority counts, owner projection, all zero keys, Administrator accounts, omitted Staff accounts, demo performance budget, account-only and safe total failure |
| UI-02, UI-10, UI-11 | `client/tests/lab-04/RequesterDashboard.test.tsx`: empty dashboard, group and sort forwarding, pagination retention, mutually exclusive filters, session required despite legacy browser storage |
| UI-01, UI-03, UI-10, UI-12 | `client/tests/lab-04/StaffDashboard.test.tsx`: metric links, loading/retry/forbidden, account-only failure, active Dashboard navigation, URL-synchronized account role filters |
| E2E-03 | `e2e/lab-04/dashboards.spec.ts`: all roles, Requester group/recent links, Staff and Administrator queue, account role/Total links, zero-Ticket Requester, mobile overflow |

The existing Lab 2 routing and Lab 3 shell/login/password-change, authorization,
and Administrator ticket-operation cases adopt FR-16 and ADR-0010. No tests are
skipped. Dashboard indexes have additive migration and rollback SQL.
