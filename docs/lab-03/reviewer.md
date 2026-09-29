# Lab 3 — Peer Review Record

**Author:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt  
**Peer reviewer:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#39](https://github.com/thrxpt/toktickit/pull/39) | feature/14-lab3-contract | Approved |
| [#40](https://github.com/thrxpt/toktickit/pull/40) | feature/15-user-model-auth-foundation | Approved |
| [#41](https://github.com/thrxpt/toktickit/pull/41) | feature/16-auth-shell-regression | Approved |
| [#42](https://github.com/thrxpt/toktickit/pull/42) | feature/17-staff-ticket-queue | Approved |
| [#43](https://github.com/thrxpt/toktickit/pull/43) | feature/18-staff-ticket-detail | Approved |
| [#44](https://github.com/thrxpt/toktickit/pull/44) | feature/19-comments-and-notes | Approved |
| [#45](https://github.com/thrxpt/toktickit/pull/45) | feature/20-admin-user-management | Approved |
| [#46](https://github.com/thrxpt/toktickit/pull/46) | feature/21-e2e-visual-release | Approved |

---

### feature/14-lab3-contract #39

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/39>

**Reviewer comment I received:**
> Overall, this is a solid and thorough contract. All 11 sections of specification.md are present, BR-01 through BR-05 match the handout verbatim, AC-01 through AC-21 are in Given-When-Then form, and the test plan has full AC traceability. The four companion docs are internally consistent, and the ADRs are well-structured.
>
> Approving with one minor cleanup: a few stale BR references (BR-43, BR-44) that don't exist in specification.md.

**How I responded:**
> Addressed review feedback from @fahsai-02 in commit `a951cb9`:
>
> 1. Added **BR-35** to `specification.md` under *System Behavior and Data Integrity* for safe error envelopes without leaking stack traces or internal details; updated reference in `api-spec.md` and `tests.md` (API-23).
> 2. Added **BR-36** to `specification.md` for database seed idempotency; updated reference in `tests.md` (API-24) and Issue #31.
>
> All 4 contract documents and test mapping tables are now 100% verified with zero missing BR references.

**Reviewer approved comment:**
> Fixes confirmed clean. BR-35 and BR-36 added to specification.md §5, api-spec.md and tests.md references updated, no stale BR-43/BR-44 references remain. All 11 sections intact, BR-01 through BR-36 numbered correctly.

---

### feature/15-user-model-auth-foundation #40

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/40>

**Reviewer comment I received:**
> **Verdict: Request changes** — 1 blocking finding (seed data violates the contract), plus 5 non-blocking warnings to address before or early in Issue 16.
>
> ### Blocking finding
> **B1. Seed data diverges from specification section 7 (named accounts)**
> - Contract — `specification.md` section 7 names the Requester set: 4 active (`jennifer.anderson`, `somchai.prasert`, `kanya.s`, `chatchai.n`), 1 inactive (`retired.staff`).
> - Code — `server/prisma/seed-data.ts:64-96` seeds: 4 active (`jennifer.anderson`, `somchai.prasert`, `marcus.chen`, `priya.raman`), 2 inactive (`daniel.okafor`, `retired.staff`).
>
> ### Non-blocking warnings
> - **W1.** `requireAuth` leaks `requesterId` to every role.
> - **W2.** Hard-coded JWT fallback secret in production.
> - **W3.** "Special character" rule accepts whitespace / any non-ASCII symbol.
> - **W4.** Login timing leaks user existence (BR-09 intent).

**How I responded:**
> Reconciled B1 using Option B, and resolved warnings W1, W2, and W4 in commits `d560b91`, `4422bac`, and `87cfdc8`:
>
> 1. **B1 Reconciliation:** Amended `docs/lab-03/specification.md` §7 to reflect the established Lab 2 baseline Requester accounts: 4 active (`jennifer.anderson`, `somchai.prasert`, `marcus.chen`, `priya.raman`) and 2 inactive (`retired.staff`, `daniel.okafor`). Ensures Lab 2 regression test `tests/lab-02/requesters.api.test.ts` (`API-26`) continues to pass without modification.
> 2. **W1:** Scoped `req.requesterId = user.id` in `server/src/middleware/auth.ts` strictly to `user.role === Role.REQUESTER`.
> 3. **W2:** Updated `server/src/auth/session.ts` to fail closed when `NODE_ENV === 'production'` and `JWT_SECRET` is unset.
> 4. **W4:** Implemented constant-time dummy bcrypt comparison in `server/src/routes/auth.ts` for unregistered emails to prevent user enumeration timing attacks.
> 5. **Whitelist Path Bypass:** Hardened `requireAuth` in `server/src/middleware/auth.ts` to strictly match parsed route pathnames. Added explicit `API-02` coverage for `retired.staff@example.ac.th`.

**Reviewer approved comment:**
> Verified: B1 reconciled with code; W1, W2, W4 implemented cleanly; whitelist gate uses strict pathname matching; full suite 128 server / 65 client tests pass.

---

### feature/16-auth-shell-regression #41

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/41>

**Reviewer comment I received:**
> **Verdict: Request changes** — 4 blocking findings (3 security leaks reproduced), plus warnings:
>
> 1. **B1 & B2.** Development Requester not removed from client routes and `X-Requester-Id` header still accepted; anonymous user can spoof tickets.
> 2. **B3.** Cross-role data leak: IT Staff and Admin sessions calling `GET /api/tickets` receive all requesters' tickets due to undefined filter in Prisma `where`.
> 3. **B4.** Logout does not purge `toktickit_requester_id` from localStorage.
> 4. **W1–W3.** `RequireAuth` not mounted in `App.tsx`; unauthenticated requester routes return 400 instead of 401.
> 5. **W4–W6.** Staff attachment download forbidden; `/remove` alias mismatch; status filter limited to `NEW`.

**How I responded:**
> Addressed all blocking findings and warnings in commits `65aa88c`, `5d658f1`, and `1c2ba92`:
>
> 1. **B3 (Cross-role leak):** Mounted `requireRequesterContext` role gate returning `403 FORBIDDEN` for non-requesters (`IT_STAFF`, `ADMINISTRATOR`) on all requester ticket routes. Guarded Prisma query against missing `requesterId`. Added tests in `authorization.api.test.ts`.
> 2. **B1 & B2 (ADR-0009):** Documented architecture decision in `ADR-0009`. Session authentication is primary; header fallback is strictly server-side for Lab 2 test compatibility. Frontend routes protected with `RequireRole roles={['REQUESTER']}`.
> 3. **B4 (Logout invalidation):** `AuthContext.logout()` terminates server cookie and purges localStorage `toktickit_requester_id`. Subsequent requests redirect to `/login`.
> 4. **W1–W6:** Mounted `RequireRole` and `RequireAuth` across all protected routes; returned 401 for anonymous calls; enabled staff attachment download (200 for staff, 403 for admin); aliased `/remove` and `/removal`; relaxed status query filter to all 8 statuses.
> 5. Updated `tests.md` traceability rows for `API-26..29` and `UI-16`.

**Reviewer approved comment:**
> Re-verified against follow-up commits. B1–B4 resolved, ADR-0009 approved, guards active in AppRoutes, traceability complete, 89 client and 138 server tests green.

---

### feature/17-staff-ticket-queue #42

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/42>

**Reviewer comment I received:**
> **Verdict: Request changes**
>
> Feature is solid and tests pass, but the PR cannot be approved as-is.
> - **B1:** Admin access: code = IT_STAFF-only (locked); PR text/spec table say `['IT_STAFF','ADMINISTRATOR']`. Contract contradicts itself — reconcile all three.
> - **B2:** PR claims `GET /api/staff/assignees` was added; it was removed by refactor commit. Restore assignees endpoint and specific staff Owner option in UI.
> - **Traceability:** Flip `RESP-01/02/03` to Passed; keep `API-17` reserved for Issue 20.
> - **W1 & W5:** Fake cursor on non-sortable header; dead fallback in router.
> - **W2 & W3:** Keyboard accessibility on sort headers; nested interactive controls.

**How I responded:**
> Addressed all checklist items in commit `aa0a27a`:
>
> - **B1:** Reconciled IT_STAFF-only queue stance across `specification.md §8`, `api-spec.md §3`, router guard, and PR description.
> - **B2:** Restored `GET /api/staff/assignees` and added specific staff Owner filter options in `StaffTicketQueue.tsx`.
> - **Traceability:** Marked `RESP-01`, `RESP-02`, and `RESP-03` as Passed; kept `API-17` reserved and added `API-30` for queue role segregation.
> - **W1 & W5:** Scoped pointer cursor strictly to `.zen-sortable-header`; removed dead fallback.
> - **W2 & W3:** Added `tabIndex={0}`, `Enter`/`Space` keyboard triggers, and `aria-sort`; removed nested interactive controls on table rows and mobile cards.

**Reviewer approved comment:**
> Approved — all pre-merge checklist items verified against the working tree: B1 reconciled, B2 assignees restored, RESP-01..03 and API-30 recorded, keyboard accessible headers, 116 client and 158 server tests pass.

---

### feature/18-staff-ticket-detail #43

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/43>

**Reviewer comment I received:**
> **Verdict: Request changes**
>
> **Blocking — B1:** Administrator access on detail endpoints contradicts BR-14, api-spec.md:342, and ADR-0008. Code gates with `requireRole("IT_STAFF", "ADMINISTRATOR")`, but administrators cannot claim or modify tickets.
>
> **Should fix:**
> - **W1:** Duplicate `requireAuth` lookup per detail request.
> - **W2:** Oversized ticket ID answers 500 instead of 400.
> - **W5:** PR description test counts.

**How I responded:**
> Addressed all findings in commit `dabbf22`:
>
> - **B1:** Restricted `staff-ticket-detail.router.ts` and `App.tsx` detail route strictly to `IT_STAFF`. Reconciled `specification.md §8` table. Inverted API tests to assert `403 FORBIDDEN` for Administrator on GET detail and all three PATCH endpoints (`/owner`, `/priority`, `/status`).
> - **W1:** Scoped `requireAuth` in `staff-queue.router.ts` directly to `GET /` to eliminate redundant auth passes on detail routes.
> - **W2:** Added safe 32-bit integer bound check in `parseTicketId` (`<= 2147483647`), returning structured `400 Bad Request` (`VALIDATION_FAILED`) on overflow.
> - **W5:** Cleaned up describe block citations and updated PR test counts.

**Reviewer approved comment:**
> LGTM

---

### feature/19-comments-and-notes #44

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/44>

**Reviewer comment I received:**
> Feature matches the contract across FR-07/08/10/14, BR-04/05/17/24/25/26/27/28, AC-08/09/14/15. Verified locally: server 220 tests, client 133 tests, clean build.
>
> Minor nits:
> 1. `api-spec.md` does not document the 400 response for `POST /api/tickets/:id/resolve-indication` on CLOSED/CANCELLED tickets.
> 2. `PublicComments` and `InternalNotes` character counter turns red past 2,000 without inline error wired via `aria-describedby`.
> 3. `theme.css` has `rgba(184,134,11,...)` hardcode instead of color-mix on `--zen-warning`.
> 4. Ensure deterministic secondary tie-break on discussions.

**How I responded:**
> Addressed in commit `b6ce2ab`:
>
> 1. Updated `docs/lab-03/api-spec.md` to document 400 `VALIDATION_FAILED` for resolve-indication on closed/cancelled tickets.
> 2. Wired `aria-invalid` and `aria-describedby` to explicit `.invalid-feedback` error elements when comment/note text exceeds 2,000 characters.
> 3. Replaced raw rgba values in `theme.css` with `color-mix` over `--zen-warning`.
> 4. Appended `{ id: "asc" }` secondary sort order on comments and notes queries.

**Reviewer approved comment:**
> Verified all review findings are addressed and the full suite is green: 222 server tests passed, 133 client tests passed, oxlint clean. Approved.

---

### feature/20-admin-user-management #45

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/45>

**Reviewer comment I received:**
> **Verdict: Request changes**
>
> 1. **Missing rows in `tests.md`:** `UNIT-06` and `STYLE-06` exist in code but have no traceability row.
> 2. **Status reconciliation:** `STYLE-01` and `RESP-04` still `Planned` in tests.md, but PR description claims all marked Passed.
> 3. **RESP-04:** Claimed in PR description but belongs to Issue 21. Drop claim or deliver.
> 4. **TOCTOU on duplicate email:** Concurrent POSTs can throw 500 instead of 409.
> 5. **Safety tooltip precedence & modal accessibility:** `isSoleActiveAdmin` should take precedence over `isSelf`; reset modal should make background drawer inert.

**How I responded:**
> Addressed in commit `6f4b09a`:
>
> 1. Added `UNIT-06` and `STYLE-06` to `docs/lab-03/tests.md` with full AC traceability.
> 2. Reconciled PR body: kept `STYLE-01` and `RESP-04` honest as `Planned` for Issue 21 scope.
> 3. Handled Prisma `P2002` unique-constraint code in `users-admin.router.ts` to return 409 Conflict with `DUPLICATE_EMAIL`.
> 4. Inverted tooltip precedence in `UserEditDrawer.tsx` so `isSoleActiveAdmin` takes priority, matching server safety response.
> 5. Added `aria-hidden` and `inert` to drawer background while password reset sub-modal is open.
> 6. Synchronized `activeAdminCount` directly from unfiltered user list.

**Reviewer approved comment:**
> Approved — all blocking items resolved. UNIT-06 / STYLE-06 rows added, status reconciliation honest, TOCTOU handled, tooltip precedence correct, drawer inertness verified. 403 total tests green across client and server.

---

### feature/21-e2e-visual-release #46

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/46>

**Reviewer verdict:** Approved (All 8 Playwright E2E and responsive tests passing, 12 committed screenshots present, traceability complete, and full test suite 100% green).
