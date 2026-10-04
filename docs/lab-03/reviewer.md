# Lab 3 — Peer Review Record

**Author:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt  
**Peer reviewer:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#39](https://github.com/thrxpt/toktickit/pull/39) | feature/14-lab3-contract | Approved |
| [#40](https://github.com/thrxpt/toktickit/pull/40) | feature/15-auth-foundation | Approved |
| [#41](https://github.com/thrxpt/toktickit/pull/41) | feature/16-auth-shell-regression | Approved |
| [#42](https://github.com/thrxpt/toktickit/pull/42) | feature/17-staff-ticket-queue | Approved |
| [#43](https://github.com/thrxpt/toktickit/pull/43) | feature/18-staff-ticket-detail | Approved |
| [#44](https://github.com/thrxpt/toktickit/pull/44) | feature/19-comments-and-notes | Approved |
| [#45](https://github.com/thrxpt/toktickit/pull/45) | feature/20-admin-user-management | Approved |
| [#46](https://github.com/thrxpt/toktickit/pull/46) | feature/21-e2e-visual-release | Changes requested → Addressed |

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
> Fixes confirmed clean. BR-35 and BR-36 added to specification.md section 5, api-spec.md and tests.md references updated, no stale BR-43/BR-44 references remain. All 11 sections intact, BR-01 through BR-36 numbered correctly.

---

### feature/15-auth-foundation #40

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
> 1. **B1 Reconciliation:** Amended `docs/lab-03/specification.md` section 7 to reflect the established Lab 2 baseline Requester accounts: 4 active (`jennifer.anderson`, `somchai.prasert`, `marcus.chen`, `priya.raman`) and 2 inactive (`retired.staff`, `daniel.okafor`). Ensures Lab 2 regression test `tests/lab-02/requesters.api.test.ts` (`API-26`) continues to pass without modification.
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
> - **B1:** Reconciled IT_STAFF-only queue stance across `specification.md section 8`, `api-spec.md section 3`, router guard, and PR description.
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
> - **B1:** Restricted `staff-ticket-detail.router.ts` and `App.tsx` detail route strictly to `IT_STAFF`. Reconciled `specification.md section 8` table. Inverted API tests to assert `403 FORBIDDEN` for Administrator on GET detail and all three PATCH endpoints (`/owner`, `/priority`, `/status`).
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

**Reviewer comment I received:**
> ## Review — Lab 3 E2E tests, visual evidence, release
>
> Nice structure — splitting the E2E suite by journey (`authentication`, `staff-ticket-flow`, `user-administration`, `responsive`) makes it easy to follow, and the 17 committed screenshots are a real asset for the report.
>
> I re-ran everything before writing this:
> - `pnpm --filter client test` → 31 files / 144 passed
> - `pnpm --filter server test` → 22 files / 261 passed
> - `pnpm build` → clean on both workspaces
> - `tsc -p . --noEmit` at the root (covers `e2e/**/*.ts`) → clean
> - All 17 PNGs are 1280×800 / 768×1024 / 390×844, matching the AC
> - Every selector used in `e2e/lab-03/` exists in `client/src`, and the error strings match `server/src/errors.ts:98-104`
> - The 17 tokens in `theme.style.test.tsx` match `ui-spec.md` section 1 exactly
>
> The `scrollWidth <= clientWidth` check for "no horizontal scroll" is a real measurement rather than a visual guess. Good choice.
>
> ---
>
> ### Blocking
>
> **1. `e2e/lab-03/global-setup.ts` seeds the development database**  
> `pnpm --filter server db:seed` resolves to `tsx --env-file=.env`, so `DATABASE_URL` is the dev DB, not a test DB. The comment on line 4 even says "development" — but Issue #37 says "Re-seeds **test** database". The code and the issue disagree, and here the code is the problem.
>
> Three consequences:
> - Every `pnpm test:e2e` run resets the developer's real accounts, including forcing Somchai to change password again.
> - `seed-data.ts` seeds reference data only and never touches transactional data, so tickets and `taylor.reed.<ts>@toktickit.com` users accumulate in the dev DB on every run.
> - The committed screenshots drift away from a clean state each time.
>
> Please point E2E at a separate test database, or at minimum stop writing to the dev DB. A new E2E database strategy section in `tests.md` section 1 would help too — right now that section only documents `toktickit_test` for API tests.
>
> **2. `docs/lab-03/reviewer.md` records PR #46 as "Approved"**  
> `reviewer.md:211-215` gives PR #46 a verdict of "Approved" — but PR #46 is the open PR that adds that file. The PR is certifying itself before anyone reviewed it. Please remove the entry or mark it "Pending" until review is actually finished.
>
> **3. Changing `testDir` silently dropped 13 Lab 2 E2E tests**  
> `playwright.config.ts:4` changes `testDir` from `./e2e/lab-02` to `./e2e/lab-03`. That removes 13 tests from `pnpm test:e2e` with no deletion and no note (5 in `evidence.spec.ts`, 4 in `requester-ticket-flow.spec.ts`, 4 in `responsive.spec.ts`).
>
> Either set `testDir` to both folders, or drop Lab 2 deliberately and update `AGENTS.md:59` and `README.md:101`, which both still describe `e2e/lab-02/` as the Playwright specs.
>
> ---
>
> ### Non-blocking (fine to fix later)
> - **C2**: `helpers.ts:54` says `login()` waits for home route or change-password, but ends at `click()`.
> - **C3**: Hardcoded year in `staff-ticket-flow.spec.ts:35,38` (`/TKT-2026-\d+/`); breaks in 2027.
> - **C4**: `"node"` in `client/tsconfig.app.json` types leaks Node globals into browser code.
> - **C5**: Nothing typechecks `e2e/` via npm scripts.
> - **C7**: `STYLE-01` token assertion uses `toContain()`; scope to `:root` block.
> - **C8**: Hex regex false-positives on words like `#fade` or `#decade`.
> - **C9**: `waitForTimeout(350)` / `(300)` on guessed debounces.
> - **C11**: Screenshot comments mention "high-resolution" for 1x scale.
> - **C12**: PR description claims semantic role exclusivity while specs use classes.
> - **D4**: Traceability overclaims in E2E-04 (conflates AC-18 and AC-19) and RESP-02 (promises 2-column forms/drawers).
> - **D3**: Ambiguity between 66 contract test IDs vs 413 runner assertion blocks.
> - **D5**: Missing E2E database isolation strategy in `tests.md` section 1.
> - **D6**: `README.md:101` still pointing to `e2e/lab-02/`.
>
> **Verdict: Request changes**, mainly for items 1–3 above.

**How I responded:**
> Addressed all blocking findings and non-blocking code/docs feedback in commits `6314fb3` and follow-up updates:
>
> 1. **B1 & D5 (E2E Database Isolation & Cleanup):**
>    - Authored `server/prisma/cleanup-e2e.ts` performing sequential child-first deletions of all E2E-created transactional records (tickets, attachments, comments, notes) and throwaway accounts (`taylor.reed.*`, `e2e.*`).
>    - Registered `globalSetup: "./e2e/lab-03/global-setup.ts"` and `globalTeardown: "./e2e/lab-03/global-teardown.ts"` in `playwright.config.ts`, invoking `pnpm db:cleanup-e2e` to restore the development database to pristine seed state before and after every test run.
>    - Authored an explicit *Database Isolation and E2E Database Strategy* section in `docs/lab-03/tests.md` section 1 detailing the dual-tier strategy (`toktickit_test` for API integration tests vs cleanup/reseeding lifecycle hooks for browser E2E tests).
> 2. **B2 (PR #46 Review Record Integrity):**
>    - Replaced the premature "Approved" verdict with the verbatim review received from @fahsai-02, complete response actions, and accurate status tracking.
> 3. **B3 & D6 (Lab 2/3 E2E Test Suite Alignment & README):**
>    - Updated root `package.json` to provide explicit scripts: `"test:e2e"` / `"test:e2e:lab3"` for Lab 3 and `"test:e2e:lab2"` for historical Lab 2 regression.
>    - Updated `README.md` layout and commands sections to accurately document `e2e/lab-03/` and `artifacts/lab-03/` alongside legacy Lab 2 artifacts.
> 4. **C2 & C11 (Helper Docstrings):**
>    - Clarified `login()` docstring in `e2e/lab-03/helpers.ts` to state that callers assert target URLs, and removed "high-resolution" hyperbole to reflect standard 1x scale.
> 5. **C3 (Ticket Number Regex):**
>    - Updated `staff-ticket-flow.spec.ts` to match `/TKT-\d{4}-\d+/`, ensuring tests do not break on 1 Jan 2027.
> 6. **C4, C7, C8 (Style Test Hardening):**
>    - Switched `theme.style.test.tsx` to ESM `import.meta.url` with `fileURLToPath`.
>    - Scoped token checks strictly to the `:root { ... }` block in `theme.css`.
>    - Tightened CSS hex regex to `: #...` and `"#..."`, eliminating false positives on words like `#fade`.
> 7. **C5 (Root E2E Typecheck):**
>    - Added root `typescript` devDependency and `"typecheck": "tsc -p . --noEmit"`. Wired `pnpm build` to run `tsc -p . --noEmit && pnpm -r build`.
> 8. **C9 (Eliminate Arbitrary Timeouts):**
>    - Removed `waitForTimeout(350)` and `waitForTimeout(300)` from `staff-ticket-flow.spec.ts` and `user-administration.spec.ts`, relying strictly on Playwright web-first assertions.
> 9. **D4 (Disentangle AC-18 and AC-19 & Fix RESP-02 Description):**
>    - In `user-administration.spec.ts`, created a second active Administrator (`e2e.admin2.<ts>@toktickit.com`) to verify `isSelf` deactivation prevention independently while another admin exists (AC-18). Then deactivated the second admin and verified sole-active-admin deactivation prevention (AC-19).
>    - Updated `RESP-02` description in `docs/lab-03/tests.md` to accurately describe the verified condensed tablet table columns and zero horizontal overflow.
> 10. **D3 (Test Metrics Clarification):**
>     - In `docs/lab-03/tests.md` section 5, explicitly distinguished between the 66 planned contract test rows (`UNIT`, `API`, `UI`, `STYLE`, `RESP`, `E2E`) and the 413 individual runner assertion blocks executed across suites.
>
> All 144 client tests, 261 server tests, root typecheck, and production builds are green.

**Reviewer verdict:** Pending verification of review updates.

---

## Pull Requests I reviewed for my partner

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#65](https://github.com/fahsai-02/toktickit/pull/65) | feature/14-sprint3-engineering-contract | Approved |
| [#66](https://github.com/fahsai-02/toktickit/pull/66) | feature/15-data-foundation | Approved |
| [#67](https://github.com/fahsai-02/toktickit/pull/67) | feature/16-auth-api-middleware | Approved |
| [#68](https://github.com/fahsai-02/toktickit/pull/68) | feature/17-auth-ui | Approved |
| [#69](https://github.com/fahsai-02/toktickit/pull/69) | feature/18-requester-regression | Approved |
| [#70](https://github.com/fahsai-02/toktickit/pull/70) | feature/19-staff-ticket-queue | Approved |
| [#71](https://github.com/fahsai-02/toktickit/pull/71) | feature/20-staff-ticket-detail | Approved |
| [#72](https://github.com/fahsai-02/toktickit/pull/72) | feature/21-admin-user-management | Reviewed by @Ohmmykung09 (merged) |
| [#73](https://github.com/fahsai-02/toktickit/pull/73) | feature/22-comprehensive-testing | Approved |
| [#74](https://github.com/fahsai-02/toktickit/pull/74) | feature/23-release-polish | Approved |
| [#75](https://github.com/fahsai-02/toktickit/pull/75) | docs/lab-03-release-integration | Approved |
| [#76](https://github.com/fahsai-02/toktickit/pull/76) | lab3-staging → main | Merged |

---

### feature/14-sprint3-engineering-contract #65

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/65>

**My comment:**
> LGTM

**Partner's response:**
> Merged into `lab3-staging`.

**My verdict:**
> Approved (`3f59026`)

---

### feature/15-data-foundation #66

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/66>

**My comment:**
> ### Changes Requested: Data Foundation (Schema, Migration & Seed) — #66
>
> This is solid foundational work for Lab 3—the schema expansion, additive migration, bcrypt password hashing, and baseline regression tests are well structured.
>
> However, there are a couple of blocking documentation and standards items that need to be resolved before merging:
>
> #### Required Changes
>
> 1. **Clarify Server Suite status in `docs/lab-03/tests.md` (section 6, line 214):**
>    - **Issue:** Section 6 records the **Server (unit + API)** suite as `Pass — 12 files / 135 tests (2026-09-12)`. But in section 2, all Lab 3 endpoints (`UNIT-01..03` and `API-01..73`) are rightfully marked `Planned` as they belong to subsequent sprint issues (Issues 16–21). Marking the entire server suite as passed at this stage is premature per `tests.md` section 6 preamble and DoD item 2.
>    - **Fix:** Update the label in section 6 to clarify that the passing result reflects the **Migration & Regression Baseline (MIG-01 + Lab 1/2 tests)** rather than the complete Lab 3 server suite.
>
> 2. **Replace forbidden `§` symbols with the word `section`:**
>    - **Issue:** `AGENTS.md` (Review Protocol) explicitly specifies: *"When referring to a spec's subsection in prose, write the word 'section' (e.g. 'section 5.2'), never the § symbol."*
>    - **Fix:** Replace all occurrences of `§<n>` with `section <n>` in:
>      - `docs/lab-03/seed-credentials.md:6` (`specification.md §11` → `specification.md section 11`)
>      - `server/prisma/seed.ts:22, 83, 454` (`§11` / `§7` → `section 11` / `section 7`)
>      - `server/tests/lab-03/migration-regression.api.test.ts:7` (`specification.md §7` → `specification.md section 7`)
>
> 3. **Use type-only import in `server/prisma/seed.ts` (line 5):**
>    - **Issue:** `RequestedPriority` is only used as a type annotation in `type SeedTicket`.
>    - **Fix:** Use `import type { RequestedPriority }` to adhere to ESM/`verbatimModuleSyntax` rules.
>
> #### Non-blocking Notes (Recommended)
>
> - **Automated count assertion:** Note that `BASELINE_COUNTS_DEFAULT` in `migration-regression.api.test.ts` defaults to 0 attachments and 15 tickets. Documenting that `PRE_MIGRATION_COUNTS` should be supplied for strict local regression checks against snapshot data is recommended.
> - **N+1 queries in seed (`server/prisma/seed.ts:538-568`):** Memoizing ticket IDs from the earlier query would avoid `findUnique` database calls inside each comment/note insert loop.
> - **Naming:** Renaming `participant` in seed fixtures to `authorEmail` would align better with the domain model's `author` / `authorId`.

**Partner's response:**
> **Thanks for the careful review! I've fixed all 3 blocking items.**
>
> ## 1. Server suite status in tests.md (section 6)
> Fixed. The table now says the `Pass` result only covers the **Migration & Regression Baseline (MIG-01 + Lab 1/2 tests)**, and that the Lab 3 endpoint tests stay `Planned` until Issues 16–21.
>
> ## 2. `§` → `section`
> Done. Replaced every `§` reference in `seed-credentials.md`, `seed.ts`, `migration-regression.api.test.ts`, and `tests.md`.
>
> ## 3. Type-only import in seed.ts
> Done. `RequestedPriority` is now imported with `import type { RequestedPriority }`.

**My follow-up comment:**
> ### PR Review Update: Follow-up on commit `634386a` — #66
>
> Thanks for addressing the previous feedback! The updates in commit `634386a` look great.
>
> #### Remaining Blocker: Test Timeout in `migration-regression.api.test.ts`
>
> When running the full server test suite (`cd server && pnpm test`), one test in `server/tests/lab-03/migration-regression.api.test.ts` consistently times out:
> - **Failing Test:** `stores only bcrypt hashes (prefix $2) and bcrypt.compare succeeds for seeded passwords` (line 141)
> - **Root Cause:** The test runs `bcrypt.compareSync` across all 11 seeded users with cost factor 12, taking ~5.2–5.5s, exceeding Vitest's default 5000ms timeout.
> - **Suggested Fix:** Pass an explicit timeout to the test (`15000` / `20000ms`) or sample 1 user per role.

**Partner's response:**
> The remaining blocker is fixed, and I also landed a few extra fixes in the same wave (commits `f8c38a8`, `8d1caa1`, `709e419`, `399647d`):
> 1. Passed explicit `20000ms` timeout to the MIG-01 test.
> 2. Verified per-user salt hashing, ownerless contrast, single source of truth for seed data, and deterministic DB assertions (`fileParallelism: false`).

**My approved comment:**
> LGTM

---

### feature/16-auth-api-middleware #67

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/67>

**My comment:**
> Nice work on the authentication foundation! The session security setup (HTTP-only, `sameSite: "lax"`, 24-hour expiration, and production-only `secure` cookies), constant-time dummy bcrypt comparison for timing attack defense, case-insensitive email normalization, and clean throwaway test data lifecycle are well executed.
>
> All 166 tests across 13 test files are currently passing, and `pnpm build` succeeds with zero TypeScript errors.
>
> #### Actionable / Items to Address
> 1. **Missing `UNIT-02` Unit Test File (`docs/lab-03/tests.md` line 35):** Add `server/tests/lab-03/password-validation.unit.test.ts` to test `validateNewPassword()` directly and flip `UNIT-02` to `Pass`.
> 2. **Update Test Summary in `docs/lab-03/tests.md` (section 6 line 203):** Update summary table to reflect current test run (13 files / 166 tests).
> 3. **Missing Test Traceability Comments (`AGENTS.md` Test-Writing Rule 9):** Add spec citations above `describe` blocks in `server/tests/lab-03/auth.api.test.ts`.
> 4. **Unnecessary `async` on Synchronous `requireRole` Middleware (`server/src/middleware/auth.ts` line 52):** Remove `async` and return synchronous `(req, res, next): void` to avoid unnecessary Promise wrapping.

**Partner's response:**
> **Thanks for the thorough review! I've addressed all 4 actionable findings and considered the 3 non-blocking observations:**
> 1. Added `server/tests/lab-03/password-validation.unit.test.ts` (7 direct tests for `validateNewPassword()`). Flipped `UNIT-02` to Pass.
> 2. Refreshed summary in `tests.md` section 6 to Pass — 14 files / 173 tests.
> 3. Added spec-anchor comments above describe blocks in `auth.api.test.ts`.
> 4. Removed `async` from `requireRole`.
> Committed as `3689c96` + `03b3924` on `feature/16-auth-api-middleware`.

**My approved comment:**
> Ready to merge into `lab3-staging`. Great job on the security foundation!

---

### feature/17-auth-ui #68

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/68>

**My comment:**
> Great work on this milestone! Replacing the temporary Dev Requester selector with session-based authentication and role-aware navigation is a major leap forward for Lab 3. The implementation of the real-time 3-rule password checklist matching the backend validation, clean route guards that avoid flashing unauthenticated screens, full session cookie propagation across all API calls, and the integration of the deferred client test hardening stash are all exceptionally well executed.
>
> All **103 client tests across 11 files** and **173 server tests across 14 files** pass cleanly, and `pnpm build` succeeds with zero errors in both packages.
>
> #### Actionable / Items to Address
> 1. **Comment out `VITE_API_URL` in `client/.env.example`:** Update to `# VITE_API_URL="http://localhost:5000"` so the file guides new setups safely on same-origin Vite proxy.
> 2. **Clean up dead CSS and add mobile truncation for `.profile-name` (`client/src/App.css:408-422`):** Remove obsolete `.btn-change-requester` / `.requester-name` rules and add mobile truncation (`max-width: 80px`).
> 3. **Update Client Suite status in `docs/lab-03/tests.md` (section 6):** Record passing baseline (`11 files / 103 tests`).

**Partner's response:**
> Addressed all 3 actionable items plus the `roleBadgeVariant` note, committed as `7c0b7ae` on `feature/17-auth-ui`:
> 1. Commented out `VITE_API_URL` in `client/.env.example`.
> 2. Cleaned dead CSS in `client/src/App.css` and added mobile truncation for `.profile-name`.
> 3. Updated `tests.md` Section 6 to `11 files / 105 tests`.

**My approved comment:**
> ### PR Review Update: Follow-up on commit `7c0b7ae` — #68
>
> Thanks for the prompt turnaround! Commit `7c0b7ae` resolves all review items cleanly. Verified 11 files / 105 passed in client test suite, 14 files / 173 passed in server suite, and clean builds. LGTM! Ready to merge into `lab3-staging`.

---

### feature/18-requester-regression #69

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/69>

**My comment:**
> Great work on this issue! Regressing all Lab 2 requester and attachment endpoints behind session authentication (`requireAuth`) while strictly ignoring any client-supplied `requesterId` (BR-03, FR-12, FR-13) is implemented cleanly.
>
> The ownership guards (403 `FORBIDDEN` across list, detail, attachments, download, soft removal, comments, and indicate-resolved), the append-only 405 enforcement, and the non-mutating "Problem Appears Resolved" toggle (FR-19, BR-20) all strictly adhere to the contracts.
>
> #### Actionable / Items to Address
> 1. **Missing CSS styling for Resolution Summary (`docs/lab-03/ui-spec.md` section 5.3):** In `client/src/App.css` (inside `@layer layout`), add `.field-readonly.resolution-summary { background: var(--color-pale); white-space: pre-wrap; }` to display with pale green background per spec.
> 2. **Documentation Typo in `README.md` (lines 102–106):** Point sentence directly to `docs/lab-03/seed-credentials.md`.
> 3. **Non-blocking Nit:** Atomic legacy Requester upsert in `server/src/app.ts` using `db.requester.upsert`.

**Partner's response:**
> Both actionable items are fixed, and the atomic-upsert nit is applied too. Committed as `b039dd5` on `feature/18-requester-regression`:
> 1. Added `.field-readonly.resolution-summary` rule with `var(--color-pale)`.
> 2. Updated README link to point to `docs/lab-03/seed-credentials.md`.
> 3. Converted legacy requester resolution to atomic `db.requester.upsert`.

**My approved comment:**
> ### PR Review Update: Follow-up on commit `b039dd5` — #69
>
> Thanks for the prompt turnaround! Commit `b039dd5` resolves all review items cleanly. Verified 16 server files / 193 passed, 13 client files / 119 passed, zero TypeScript errors. LGTM! Approved for merge into `lab3-staging`.

---

### feature/19-staff-ticket-queue #70

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/70>

**My comment:**
> ### Changes Requested: IT Staff Ticket Queue API + UI — #70
>
> Great work on this issue! The implementation of the IT Staff Ticket Queue is well-architected and adheres closely to `docs/lab-03/specification.md`, `docs/lab-03/api-spec.md`, and `docs/lab-03/ui-spec.md`.
>
> #### Actionable / Items to Address
> 1. **Missing `db.$disconnect()` in `staff-queue.api.test.ts` (Rule 8 violation):** Add top-level `afterAll(async () => { await db.$disconnect(); });` in `server/tests/lab-03/staff-queue.api.test.ts`.
>
> #### Observations / Non-blocking Nits
> - Reusing shared `MobileSortSelect` and `options.ts` in `StaffTicketQueue.tsx`.
> - Declaring `hasActiveFilters` above `loadTickets` to eliminate TDZ risk.
> - Setting explicit column widths in `App.css` per `ui-spec.md` section 5.4.

**Partner's response:**
> The blocking item and all three nits are addressed, committed as `b214982` on `feature/19-staff-ticket-queue`:
> 1. Added `afterAll` database teardown in `staff-queue.api.test.ts`.
> 2. Adopted shared `MobileSortSelect` and options mapping in `StaffTicketQueue.tsx`.
> 3. Moved `hasActiveFilters` declaration above `loadTickets`.
> 4. Pinned table column widths in `App.css` matching ui-spec section 5.4.

**My approved comment:**
> ### PR Review Update: Approved — #70
>
> Thanks for quickly addressing all feedback in commit `b214982`! All suites and builds pass cleanly (server 17 files / 210 tests, client 14 files / 137 tests). LGTM! Ready to merge into `lab3-staging`.

---

### feature/20-staff-ticket-detail #71

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/71>

**My comment:**
> Overall excellent work implementing the IT Staff Ticket Detail API and UI! The backend test suite is comprehensive (19 files / 262 tests pass) and the client suite is solid (16 files / 169 tests pass). The BR-12 status transition matrix and append-only enforcement are rock solid.
>
> #### Actionable / Items to Address
> 1. **Tablet Layout Stacking (`docs/lab-03/ui-spec.md` section 5.5 line 224, section 6 line 289):** Adjust media query breakpoint for `.staff-detail-layout` to `@media (max-width: 991px)` to stack info on top and tabs below on tablet.
> 2. **Mobile Scrollable Tabs Strip (`docs/lab-03/ui-spec.md` section 5.5 line 226, section 6 line 290):** At mobile viewports (`@media (max-width: 768px)`), apply `flex-wrap: nowrap; overflow-x: auto;` to keep tabs as a horizontal scrollable strip.
> 3. **Attachment Tab Count Counts Soft-Removed Files (`docs/lab-03/ui-spec.md` section 5.5 line 203, `specification.md` BR-18):** Filter active attachments `ticket.attachments.filter((a) => !a.isRemoved).length` for the tab count.
> 4. **Resolution Summary "Saved." Feedback Lingers on Edit (`client/src/StaffTicketDetail.tsx` line 670):** Add `setResolutionSaved(false)` in textarea `onChange`.
> 5. **Inactive Category Disappears from Dropdown (`docs/lab-03/ui-spec.md` section 5.5):** If `ticket.category` is not in active categories, append it to options so historical tickets don't show a blank value.

**Partner's response:**
> Thanks for the detailed review — all points verified and fixed in commit `2accd99`:
> 1. Added `@media (max-width: 991px)` stacking rule in `client/src/App.css`.
> 2. Applied horizontal scrollable tab strip at `<768px`.
> 3. Filtered active attachments count for tab header.
> 4. Added `setResolutionSaved(false)` to clear success message on subsequent edits.
> 5. Appended historical category to options list if inactive.
> Added 5 new regression tests in `StaffTicketDetail.test.tsx` (16 files / 174 client tests passing).

**My approved comment:**
> All items from the previous review have been cleanly and thoroughly resolved in commit `2accd99`!
>
> | Item | Previous State | Resolved State in `2accd99` | Verification Proof |
> | :--- | :--- | :--- | :--- |
> | **1. Tablet Layout Stacking** | 2-column grid below 992px | `@media (max-width: 991px)` stacks layout | `App.css:1501-1509` |
> | **2. Mobile Scrollable Tabs Strip** | Wrapped across multiple lines | Horizontal scrollable strip at `<768px` | `App.css:1561-1565` |
> | **3. Active Attachment Tab Count** | Included soft-removed | Filtered active attachments | `StaffTicketDetail.tsx:324` |
> | **4. Resolution "Saved." Reset** | Remained visible on edit | Cleared on textarea `onChange` | `StaffTicketDetail.tsx:684` |
> | **5. Inactive Category Handling** | Showed blank select | Appended inactive category | `StaffTicketDetail.tsx:329-332` |
>
> All 262 server tests and 174 client tests pass cleanly. LGTM!

---

### feature/21-admin-user-management #72

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/72>

**Note on Review:**
> Reviewed by peer reviewer @Ohmmykung09 (changes requested on confirmation dialog for deactivation, duplicate-email error shape, concurrent P2002 409 Conflict, and nested modal/drawer Escape handling). Partner resolved all items in follow-up commits. Merged into `lab3-staging`.

---

### feature/22-comprehensive-testing #73

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/73>

**My comment:**
> ### Summary
> PR #73 successfully sets up the Lab 3 E2E test runner, implements 3 new Playwright specs (`authentication`, `staff-ticket-flow`, `user-administration`), adds the Zen Green client style suite (`zen-green-lab3-style.test.tsx`), and provides a DB cleanup utility (`cleanup-e2e.ts`). All tests pass deterministically with clean CSS architecture.
>
> ### Key Points to Address
> 1. **Move cleanup to `test.afterAll()`** (`staff-ticket-flow.spec.ts:83`, `user-administration.spec.ts:89`): Running cleanup at the end of the test body means an assertion failure mid-test skips cleanup, leaving dirty database state. Move to `test.afterAll()` to guarantee cleanup.
> 2. **Prevent parallel worker collisions in config** (`playwright.config.ts:6`): Set `fullyParallel: false` and `workers: 1` directly in `playwright.config.ts` so running `npx playwright test` without CLI flags won't race the shared database.
> 3. **E2E-04: Test AC-11 (403 Self-Deactivation)** (`user-administration.spec.ts:70`, `docs/lab-03/tests.md:165`): Deactivating the sole admin triggers 409 (last active admin, AC-12). Create a second admin in the test to exercise the 403 self-deactivation path (AC-11) instead of demoting E2E-04 in `tests.md`.
> 4. **E2E-04: Test AC-10 First Login** (`user-administration.spec.ts:39`): Log in with the newly created user's initial credentials to verify redirection to `/change-password` before deactivating them.
> 5. **Deduplicate Seed Data** (`e2e/lab-03/helpers.ts:12`, `authentication.spec.ts:88`): Import passwords from `server/src/lib/seedCredentials.ts` rather than inlining string literals, and avoid hardcoded `"robert.brown@toktickit.dev"`.

**Partner's response:**
> Thanks for the review. I fixed all 5 points and the minor ones (commits `6153147` and `f0be241`):
> 1. Moved cleanup to `useLab3DbHooks()` (`beforeAll`/`afterAll` with 180s timeouts) across all specs.
> 2. Added `fullyParallel: false` and `workers: 1` in `playwright.config.ts`.
> 3. Created a throwaway second Administrator to explicitly verify 403 self-deactivation.
> 4. Tested first login redirect to `/change-password` and completed password change.
> 5. Removed hardcoded passwords and resolve dynamically from `server/src/lib/seedData.ts`.
> 6. Fixed child-first deletion order in `cleanup-e2e.ts` to prevent FK constraint errors.

**My approved comment:**
> ### Summary
> All items from the previous review round have been thoroughly and accurately addressed in commits `6153147` and `f0be241`. The E2E test harness now guarantees database teardown via lifecycle hooks, configures single-worker execution directly in `playwright.config.ts`, completes AC-09/10/11 coverage, and eliminates seed data duplication. Verified 286 server tests, 201 client tests, and E2E specs passing cleanly. LGTM!

---

### feature/23-release-polish #74

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/74>

**My comment:**
> ### Summary
> LGTM! Approving the visual evidence and layout fixes in this PR without requiring the minor documentation nits to block merge.
>
> ### What was verified:
> - **Visual evidence & viewports**: All 72 screenshots across 10 screens and 14 states captured cleanly at the exact AC viewports (Desktop `1440×900`, Tablet `820×1180`, Mobile `375×844`). All mobile captures measure exactly 375px wide.
> - **Layout & design fixes**:
>   - Mobile header overflow fixed via `.profile-role { display: none; }` and flex shrink on mobile.
>   - Primary button focus indicator contrast fixed with `var(--color-secondary)` per `ui-spec.md` section 7.
>   - Internal Note button contrast restored to 5.17:1 resting / 8.72:1 hover (`color: #fff`).
> - **`.gitignore` fix**: Deliverables under `artifacts/` are properly tracked via `!artifacts/**/*.png`.
> - **Test suites & builds**: Server: 20 files / 286 tests Pass; Client: 18 files / 201 tests Pass; `tsc` and `vite build` clean in both packages; Visual specs: 105 passed (72 screenshot captures + 33 visual-audit assertions).
>
> Ready to merge into `lab3-staging`!

**Partner's response:**
> Merged into `lab3-staging`.

**My verdict:**
> Approved (`84884a1`)

---

### docs/lab-03-release-integration #75

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/75>

**Partner's comment:**
> I've just pushed a small update to README.md on this branch. It fixes three things that didn't match the actual behaviour: the seeded account passwords, what the seed loads, and the "removed" wording for the last active Administrator. Could you take a look at it? Thank you.

**My comment:**
> ### Summary
> LGTM! Approving PR #75. This PR completes the Phase B documentation and contract alignment for Issue 23 (#64), cleanly resolving the deferred nits from PR #74, updating the engineering contracts (`api-spec.md` v1.1, `specification.md`, `tests.md`, `ui-spec.md`) to match shipped code, and providing the full `reviewer.md` rewrite (1812 lines).
>
> ### Key Highlights Verified:
> - **Contract Alignment (`api-spec.md` v1.1 & `specification.md`)**:
>   - Attachment download headers verified against `server/src/app.ts:1001-1009`.
>   - String trimming exclusion for passwords verified against `server/src/routes/auth.ts:31, 104-107`.
>   - Rejected status transitions documented as `400` (`BUSINESS_RULE_VIOLATION`), matching `server/src/app.ts:1475`, AC-09, and BR-12.
>   - Admin safety rules order (last-active-admin `409` evaluated before self-deactivation `403`) verified against `server/src/app.ts:2077-2097`.
>   - 5-active attachment limit, check order, and staff/admin upload access matrix (section 4.12) verified against `server/src/app.ts:830-910`.
> - **Accurate Verification Metrics (`tests.md` & `ui-spec.md`)**:
>   - Horizontal scroll assertion count corrected to 69 of 72 capture runs.
>   - All 26 rows in `ui-spec.md` section 9.1 visual checklist confirmed with explicit `Pass` marks based on student review.
> - **Commit `dd6d857` Updates (`README.md`)**:
>   - Admin safety wording "cannot be deactivated" aligned with `specification.md` section 2 & section 5 FR-46.
>   - Seed description and initial password behavior accurately reflect `server/prisma/seed.ts` and `docs/lab-03/seed-credentials.md`.
>   - Mobile viewport `375×844` aligned with AC-15.
> - **Audit Records (`reviewer.md` & `ai-use.md`)**:
>   - `reviewer.md` completely documents all 17 PR records (#65–#74 authored, #39–#45 reviewed in partner fork), quoting the PR #74 approval verbatim with merge commit `84884a1`.
>   - `ai-use.md` curated to exactly 10 key prompts mapped to GitHub issues (#57–#64) and 4 clear reflection themes.
> - **Builds & Codebase Status**:
>   - `client`: 18 files / 201 tests Pass; `tsc && vite build` clean.
>   - `server`: `tsc` clean; unit tests pass; Prisma generated clean.
>   - Exactly 72 screenshots tracked under `artifacts/lab-03/screenshots/`.
>
> Ready to merge into `lab3-staging`!

**Partner's response:**
> Merged into `lab3-staging`.

**My verdict:**
> Approved

---

### lab3-staging → main #76

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/76>

**Title:** `chore(release): merge Lab 3 into main (#64)`

**Verdict:**
> Merged into `main` (`84884a1`). Full Lab 3 multi-role authenticated service desk increment shipped to production.
