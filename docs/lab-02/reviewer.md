# Lab 2 — Peer Review Record

**Author:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt  
**Peer reviewer:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#10](https://github.com/thrxpt/toktickit/pull/10) | feature/5-lab2-contract | Approved |
| [#20](https://github.com/thrxpt/toktickit/pull/20) | feature/6-data-model-seed | Approved |
| [#21](https://github.com/thrxpt/toktickit/pull/21) | feature/7-app-shell-theme | Approved |
| [#22](https://github.com/thrxpt/toktickit/pull/22) | feature/8-requester-context | Approved |
| [#23](https://github.com/thrxpt/toktickit/pull/23) | feature/9-create-ticket | Approved |
| [#24](https://github.com/thrxpt/toktickit/pull/24) | feature/10-my-tickets | Approved |
| [#25](https://github.com/thrxpt/toktickit/pull/25) | feature/11-ticket-detail | Approved |
| [#26](https://github.com/thrxpt/toktickit/pull/26) | feature/12-attachments | Approved |
| [#27](https://github.com/thrxpt/toktickit/pull/27) | feature/13-e2e-visual-release | Approved |
| — | lab2-staging → main | Pending PR #27 merge |

---

### feature/5-lab2-contract #10

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/10>

**Reviewer comment I received:**
> Two issues to fix:
>
> **1. Test count mismatch**
>
> PR description says "66 planned tests" but `tests.md` section 6 totals **71** (6 unit + 27 API + 21 UI + 7 style + 5 responsive + 5 E2E). The 66 omits the 5 responsive tests. Pick one number and make it consistent across the PR description and `tests.md`.
>
> **2. Wrong BR reference in FR-09**
>
> `specification.md` line 78 says `sorting by the fields named in BR-23`, but BR-23 is about API enforcement of validation rules. Sorting fields are defined in **BR-28**. Should read `BR-28`.

**How I responded:**
> Both confirmed and fixed. Thanks — the FR-09 one would have broken the FR→BR trace, which is the part of the contract everything else hangs off.
>
> **1. Test count mismatch**
>
> `tests.md` was the correct side, so the PR description moved to it. §2 does hold 71 rows: 6 UNIT + 27 API + 21 UI + 7 STYLE + 5 RESP + 5 E2E, matching the §6 total.
> Cause was exactly as you read it: RESP-01…RESP-05 share the "Responsive and E2E" section with the E2E rows, so writing up the PR I collapsed that section to "5 E2E" and lost five tests. PR description now reads `71 planned tests (27 API, 21 UI, 7 style, 6 unit, 5 responsive, 5 E2E)`, with responsive broken out so the section can't collapse again. No change to `tests.md`.
>
> **2. Wrong BR reference in FR-09**
>
> Correct — BR-23 is "every rule in this section is enforced by the API", nothing about sorting; BR-28 is the sortable field list (`createdAt`, `ticketNumber`, `updatedAt`). Fixed in `d045755`.
> Swept remaining BR cross-references (`BR-42 → BR-22`, filter columns from `BR-27`).

**Reviewer approved comment:**
> Okay, everything looks good.

---

### feature/6-data-model-seed #20

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/20>

**Reviewer comment I received:**
> Looks good. Everything matches the contract. Schema, migration, seed, reference endpoints, and test harness are all in place.  
> PS. Don't forget to link the issue to the PR in the Development tab.

**How I responded:**
> Oh, I missed it! Thank you for reminding me 🙏 (Linked Issue #12 to the PR in the Development tab).

**Reviewer verdict:**
> Approved (`893e3c0`)

---

### feature/7-app-shell-theme #21

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/21>

**Reviewer comment I received:**
> **Verified:** 12 client files / 37 tests pass · `tsc -b` + `oxlint` clean · no hex outside `theme.css` · CheckSystem moved verbatim (D-13) · full route table + Lab 1 tests intact.
>
> **Must fix:**
>
> 1. **Traceability gap in `docs/lab-02/tests.md`**: Four new test files have no row in `tests.md` §2 (`AppRoutes.test.tsx`, `StateBlock.test.tsx`, `ConfirmDialog.test.tsx`, `Pagination.test.tsx`). Violates AGENTS.md and `tests.md` §1.
> 2. **Header missing a visible focus ring (AC-45)**: `.zen-nav-link` / `.zen-brand` (`theme.css:56-89`) only change color on `:focus`, no `--zen-secondary` ring — though `ui-spec.md` §3 requires one.
>
> **Nice to fix:**
>
> 1. **Read-only `FormField` renders `<div aria-readonly="true">`**: Meaningless on a div; `<label htmlFor>` cannot associate. Use a real `<input readOnly>`.
> 2. **MEDIUM/HIGH badge colors are ad-hoc hex**: Not blocking.

**How I responded:**
> Addressed all feedback from review:
>
> 1. **Traceability in `docs/lab-02/tests.md`:** Added test rows `UI-22` through `UI-25` covering `AppRoutes.test.tsx`, `StateBlock.test.tsx`, `ConfirmDialog.test.tsx`, and `Pagination.test.tsx`. Updated planned UI test counts in §6 (from 21 to 25, grand total from 72 to 76) and matching `describe` titles in test files.
> 2. **Header visible focus ring (`AC-45`, `ui-spec.md` §3):** Added explicit `--zen-secondary` focus ring with `:focus-visible` on `.zen-brand`, `.zen-nav-link`, and global `:focus-visible` in `client/src/styles/theme.css`.
> 3. **Read-only `FormField`:** Updated read-only presentation in `FormField.tsx` to render `<input readOnly tabIndex={-1} className="form-control zen-readonly">` for proper label association (`htmlFor`) while keeping it non-focusable in the tab order.  
> All 47 tests pass across 16 test files.

**Reviewer approved comment:**
> LGTM

---

### feature/8-requester-context #22

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/22>

**Reviewer comment I received:**
> All acceptance criteria met, all tests pass (44 client + 24 server), error codes match the API spec, and the Lab 3 seam is preserved. No blocking issues.

**How I responded:**
> Merged into `lab2-staging`.

**Reviewer verdict:**
> Approved (`2e991cb`)

---

### feature/9-create-ticket #23

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/23>

**Reviewer comment I received:**
> **Overall: Solid implementation.** All 105 tests pass, traceability is complete, and the contract is followed closely. Four items below:
>
> 1. **`RESTART IDENTITY` in truncate resets the sequence (High):** `server/tests/setup/truncate.ts:10` runs `TRUNCATE TABLE "Attachment", "Ticket" RESTART IDENTITY CASCADE`. `RESTART IDENTITY` resets `ticket_number_seq` to its starting value after every `beforeEach`.
> 2. **Error message contradicts design intent (Medium):** `server/src/errors.ts:47` says `"Ticket number conflict. Please try again."`, but design says sequence conflicts are not expected in normal operation and should not be retried. Suggested fix: `"A ticket number conflict occurred. Please contact support."`
> 3. **Inconsistent fetch usage for reference data (Medium):** `CreateTicket.tsx:42-49` uses raw `fetch` for `/api/categories` and `/api/related-systems`, but `apiFetch` for ticket creation.
> 4. **Read-only fields are click-focusable (Low):** Clicking on `<input readOnly tabIndex={-1}>` still shows a text cursor.

**How I responded:**
> Thanks for the thorough and constructive review! Here is our response and breakdown of each item:
>
> 1. **`RESTART IDENTITY` in truncate (`server/tests/setup/truncate.ts`):** In PostgreSQL, `TRUNCATE ... RESTART IDENTITY` only resets sequences that are **owned by** columns of the truncated tables (e.g. `SERIAL` / `IDENTITY` columns like `Ticket_id_seq` and `Attachment_id_seq`). Because `ticket_number_seq` was created as an independent, standalone sequence (`CREATE SEQUENCE "ticket_number_seq"` without `OWNED BY`), `TRUNCATE TABLE "Attachment", "Ticket" RESTART IDENTITY CASCADE` **does not** reset `ticket_number_seq`. The sequence counter continues to advance monotonically across test cases and test files as intended. We verified this against the test database, so `RESTART IDENTITY` is retained.
> 2. **Error message contradicts design intent (`server/src/errors.ts`):** Fixed. Updated the error message for `TICKET_NUMBER_CONFLICT` to `"A ticket number conflict occurred. Please contact support."` (BR-43).
> 3. **Inconsistent fetch usage for reference data (`CreateTicket.tsx`):** Clarified. Raw `fetch` is used intentionally here because `/api/categories` and `/api/related-systems` are public reference data endpoints that do not require `X-Requester-Id` context per `api-spec.md`. Added an inline comment documenting this architectural distinction.
> 4. **Read-only fields focus behavior (`FormField.tsx`):** Acknowledged. Fields use `<input readOnly tabIndex={-1}>` to satisfy `STYLE-03` and `STYLE-07` test assertions.

**Reviewer approved comment:**
> Okay, everything passed!

---

### feature/10-my-tickets #24

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/24>

**Reviewer comment I received:**
> Overall the implementation is solid — ownership enforcement, Zod strict validation, stable tiebreak, and the empty vs no-results distinction are all well done. Two issues need to be fixed before merge:
>
> 1. **Race condition — stale response overwrites fresh data:** `fetchTickets` has no `AbortController`. If the user changes a filter while a request is in flight, both responses call `setTickets()`. The slower response wins regardless of which was made last. Fix: wrap in `AbortController`, abort on cleanup, and skip `setError` on `AbortError`.
> 2. **`fetchTickets` early return leaves loading spinner forever:** When `selectedRequester` is null, `fetchTickets` returns before calling `setLoading(false)`. Fix: add `setLoading(false)` before the early return.

**How I responded:**
> Both items have been addressed in commit `7993ebb`:
>
> 1. **Race Condition Prevention:** Wrapped `fetchTickets` in an `AbortController` that aborts any in-flight requests on parameter change or component unmount, safely ignoring `AbortError` so stale responses never overwrite current search/filter views.
> 2. **Loading State with Null Requester:** Added explicit `setLoading(false)` if `selectedRequester` is not present, preventing any permanent spinner state, and wired `onRetry` to trigger re-fetches via a retry counter. Added regression test coverage in `MyTickets.test.tsx`.  
> All 125 tests (39 server + 56 client) and builds are green.

**Reviewer approved comment:**
> LGTM. Both issues addressed correctly. AbortController handles stale responses cleanly, and the null-requester loading edge case is covered with a regression test.

---

### feature/11-ticket-detail #25

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/25>

**Reviewer comment I received:**
> Solid implementation the `findFirst` ownership pattern, 404 indistinguishability, and read-only rendering are all correct.
>
> **Two notes for awareness (not blocking):**
>
> 1. **`FormField.readOnly` renders `<input>` future footgun:** `FormField.tsx:47-56` renders an `<input readOnly tabIndex={-1}>` when `readOnly` is true. This PR correctly uses `ReadOnlyField` (a `<div>`) instead, but `FormField.readOnly` still exists in the codebase. Consider deprecating or removing `FormField.readOnly` to prevent misuse.
> 2. **Extra DB query on every 404:** `tickets.ts:234-245` runs a second `findUnique` after the first query returns null, solely to log whether the miss was "not owned" vs "genuinely missing". Correct for diagnostics but adds latency on every 404.

**How I responded:**
> Acknowledged both notes. Confirmed `ReadOnlyField` is used across Ticket Detail to prevent keyboard navigation/tab order issues, and the diagnostic query is retained strictly for developer observability during testing.

**Reviewer verdict:**
> Approved (`022d099`)

---

### feature/12-attachments #26

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/26>

**Reviewer comment I received:**
> Extensive review covering the Attachment lifecycle:
>
> 1. **`isImageAttachment` is imprecise:** `mime.startsWith("image/")` matches unpermitted image types. Match the explicit allowed types (`image/jpeg`, `image/png`, `image/webp`).
> 2. **`formatContentDisposition` does not strip semicolons:** Filename with `;` could cause HTTP header attribute parsing ambiguities. Add `;` to sanitization regex.
> 3. **`serializeRemovedAttachment` silently falls back when `removedBy` is null:** Masking data integrity issues by falling back to uploader. Require `removedBy` explicitly.
> 4. **`formatIsoString` fallback uses current time:** Could mask null `removedAt` by appearing as removed "just now".
> 5. **No `X-Content-Type-Options: nosniff` on content route:** Add header to prevent MIME-sniffing.
> 6. **Synchronous `fs.existsSync` in async handler:** Blocks event loop; use `fs.promises.access`.
> 7. **Preview modal accessibility:** Modal does not trap focus or listen for `Escape` key (`ui-spec.md` §3).

**How I responded:**
> All feedback items resolved:
>
> 1. **Narrowed `isImageAttachment`** (`client/src/utils/file.ts`): Restricted checks to explicit allowlisted image MIME types (`image/jpeg`, `image/png`, `image/webp`) and permitted extensions.
> 2. **Sanitized Semicolons in `formatContentDisposition`** (`server/src/attachments/storage.ts`): Added `;` to ASCII fallback sanitization regex.
> 3. **Removed Silent `removedBy` Fallback** (`server/src/tickets/attachment-serializer.ts`): Strictly requires `removedBy` and `removedAt` to be present, throwing on data integrity failure.
> 4. **Removed Date Fallback to `now()`** (`server/src/tickets/attachment-serializer.ts`): Requires valid date value.
> 5. **Added `X-Content-Type-Options: nosniff`** (`server/src/routes/attachments.ts`): Content streaming route sends `nosniff`.
> 6. **Asynchronous File Existence Check** (`server/src/attachments/storage.ts` & `server/src/routes/attachments.ts`): Converted to `fs.promises.access`.
> 7. **Preview Modal Accessibility** (`client/src/components/AttachmentSection.tsx`): Implemented focus trap, `Escape` key close listener, and focus return to the trigger element (`ui-spec.md` §3).  
> Full suite: 98 server tests passing, 65 client tests passing (`5546073`, `55eb92a`).

**Reviewer approved comment:**
> LGTM, thanks for addressing all the feedback.

---

### feature/13-e2e-visual-release #27

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/27>

**Reviewer verdict:** Approved by @fahsai-02

**Reviewer approved comment:**
> LGTM

**How I responded:**
> Thank you for the review! All 10 E2E and responsive tests are passing, 25 committed screenshots verified, seed idempotency confirmed, and release documentation completed. Ready to merge into `lab2-staging`.

---

## Pull Requests I reviewed for my partner

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#45](https://github.com/fahsai-02/toktickit/pull/45) | feature/5-sprint-specification | Approved |
| [#46](https://github.com/fahsai-02/toktickit/pull/46) | feature/6-db-seed | Approved |
| [#47](https://github.com/fahsai-02/toktickit/pull/47) | feature/7-requester-context | Approved |
| [#48](https://github.com/fahsai-02/toktickit/pull/48) | feature/8-create-ticket | Approved |
| [#49](https://github.com/fahsai-02/toktickit/pull/49) | feature/9-my-tickets | Approved |
| [#50](https://github.com/fahsai-02/toktickit/pull/50) | feature/10-ticket-detail | Approved |
| [#51](https://github.com/fahsai-02/toktickit/pull/51) | feature/11-attachments | Approved |
| [#52](https://github.com/fahsai-02/toktickit/pull/52) | feature/12-e2e-visual | Approved |
| [#53](https://github.com/fahsai-02/toktickit/pull/53) | feature/13-release-docs | Approved |
| [#54](https://github.com/fahsai-02/toktickit/pull/54) | lab2-staging → main | Approved |

---

### feature/5-sprint-specification #45

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/45>

**My comment:**
> Nice Spec DD overall — traceability is complete and cross-file consistency is strong.

**Partner's response:**
> Thank you! If everything is okay, you can merge this whenever you're good with it.

**My approved comment:**
> Approved (`fcc180c`)

---

### feature/6-db-seed #46

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/46>

**My comment:**
> **Review of `feature/6-db-seed` vs `lab2-staging`** — schema/migration/seed match §7 verbatim and AGENTS.md conventions are followed (committed migration, no `db push`, correct Prisma 7 datasource). Nice work overall. A few findings:
>
> **Must address:**
>
> 1. **Silent category fallback in seed (`server/prisma/seed.ts`):** `const categoryId = system.categoryName ? categoryIdByName.get(system.categoryName) ?? null : null;` A mistyped `categoryName` silently seeds an unassigned system with no error — it would quietly break FR-06 filtering for that row later. Please throw (or at least warn) when a named category isn't found.
> 2. **Inconsistent seed update policy:** Categories use `update: {}` while related systems/requesters use `update: data`. Categories will never backfill new columns on re-run. Pick one policy intentionally.
>
> **Non-blocking / notes:**
>
> 1. **Sort-field indexes:** FR-14 sorts by `createdAt`/`requestedPriority` and BR-17 searches Summary, but none is indexed. §7's required index list is met exactly, so fine for this sprint — just flagging for whichever issue adds ticket search/sort.
> 2. **Requester upserts reset `isActive`:** Reactivating Robert Brown manually gets clobbered on next seed. Worth a one-line note in `seed.ts`.
> 3. **PR body slightly overstates AD-06:** It sanctions "`itPriority` exists, nullable, never set this sprint," not specifically the `RequestedPriority?` reuse.

**Partner's response:**
> Thanks for the thorough review! Here's the resolution for each finding:
>
> **Must address (Fixed):**
>
> 1. **Silent category fallback:** Fixed. The code now throws an explicit Error with a clear message if a named category is not found. It will no longer silently set `categoryId = null`. This stops ticket filtering (FR-06) from breaking later.
> 2. **Inconsistent seed update policy:** Fixed. Categories now use `update: data` just like systems and users. This ensures new database columns will fill in correctly if the seed runs again.
>
> **Non-blocking / Notes:**
>
> 1. **Sort-field indexes:** Agreed. I have noted this down and flagged it for the upcoming task that will add ticket search and sorting features.
> 2. **User status resets every run:** Added a one-line comment `// NOTE:` in `seed.ts`. It explains that the user status is intentionally reset to match the default seed data on every run.
> 3. **PR body detail:** Understood. Reusing `RequestedPriority?` is fine for now based on section 7.

**My approved comment:**
> LGTM

---

### feature/7-requester-context #47

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/47>

**My comment:**
> Great work setting up the simulated requester workflow, CSS layers foundation, and the reference APIs along with comprehensive test coverage! Here are a few observations and suggestions:
>
> **Issues & Spec Alignments:**
>
> 1. **Requester Name on Mobile Viewport (`client/src/App.css`):** Spec (`ui-spec.md` §4): *"Mobile (<768px): header keeps brand + requester name (truncated); nav collapses into a hamburger toggle..."* Currently, `@media (max-width: 768px)` sets `.requester-name { display: none; }`. Keep it visible with truncation (`max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`).
> 2. **`aria-required` & `required` on `<SelectField />` (`client/src/components/SelectField.tsx`):** Spec (`ui-spec.md` §3 & §7): *"Required fields show a red `*` after the label text plus `aria-required=\"true\"`."* Forward `required={required}` and `aria-required={required ? "true" : undefined}` to `<select>`.
> 3. **URL Construction in `fetchRelatedSystems` (`client/src/api.ts`):** `new URL(`${API_URL}/api/related-systems`)` will throw runtime `TypeError: Invalid URL` if `VITE_API_URL` is empty. Provide a fallback base origin (`window.location.origin`).
>
> **Minor / Housekeeping:**
>
> - Update `client/src/components/INVENTORY.md` for `NavLink`.

**Partner's response:**
> Thanks for the careful review; all four points are valid and have been addressed.
>
> 1. **Requester name on mobile viewport:** Removed `display: none`; the name now stays visible with `max-width: 120px` and truncation on mobile.
> 2. **`required` / `aria-required` on `<SelectField />`:** Forwarded both props to `<select>`.
> 3. **URL construction in `fetchRelatedSystems`:** Added fallback base to `window.location.origin`.
> 4. **`INVENTORY.md`:** Removed stale `NavLink` row.
>
> **Bonus fixes:** Active nav bold text (`ui-spec.md` §4), mobile tap targets ≥ 44px (`ui-spec.md` §6 / AC-25), hamburger visible tooltip, and updated `api-spec.md` base URL to v1.1.

**My approved comment:**
> All review findings have been resolved cleanly:
>
> - Requester name is visible and truncated on mobile headers (`ui-spec.md §4`).
> - `required` and `aria-required` are properly forwarded to `<select>` in `SelectField` (`ui-spec.md §3, §7`).
> - `fetchRelatedSystems` safely handles empty/relative API URL origins.
> - Mobile tap targets (≥44px), active nav weight, and documentation updates align well with the Lab 2 specifications.  
> Approved! LGTM.

---

### feature/8-create-ticket #48

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/48>

**My comment:**
> Great work on the Create Ticket flow. The form handling, client-side staging, backend ticket generator, and test coverage (72 tests passing) are well put together.
>
> **Spec Alignments:**
>
> 1. **Keep selects disabled on reference-data failure (`client/src/CreateTicket.tsx`):** Spec (`ui-spec.md` §5.2): *"Reference-data failure: banner with Retry at top; selects disabled until loaded."* When fetching fails, `setDataLoading(false)` leaves dropdowns enabled while empty. Fix: `disabled={dataLoading || Boolean(loadError)}`.
> 2. **Cancel button alignment (`client/src/App.css`):** Actions row requires Cancel (left) and Submit Ticket (right). `.create-actions` uses `justify-content: flex-end`. Fix: `justify-content: space-between`.
> 3. **Tablet layout for classification fields (`client/src/App.css`):** Spec requires tablet: Category+System share a row, Priority below; mobile: stacked. Add tablet media query (769px–991px).
> 4. **Attachment MIME type check (`client/src/CreateTicket.tsx`):** Check `file.type` against `ALLOWED_MIME_TYPES` in addition to extension.
> 5. **Ticket number generation query (`server/src/app.ts`):** `tx.ticket.findMany()` loads every ticket for the year into Node memory. Use `findFirst({ orderBy: { ticketNumber: "desc" } })`.
>
> **Housekeeping:**
>
> 1. Update `client/src/components/INVENTORY.md`.
> 2. Prisma internal import: Avoid importing from `./generated/prisma/internal/prismaNamespace.js`.

**Partner's response:**
> Thanks for the detailed review. All points addressed and fixed:
>
> 1. Selects disabled on reference-data failure: Applied `disabled={dataLoading || Boolean(loadError)}` to all three selects.
> 2. Cancel button alignment: Changed to `space-between` (Cancel left, Submit right on desktop/tablet).
> 3. Tablet layout for classification fields: Added media query for 769px–991px with Category+System on row 1, Priority spanning 2 columns below.
> 4. Attachment MIME type check: Validates both `file.type` and extension.
> 5. Sequence query: Replaced `findMany()` with `findFirst` to fetch only the highest number.
> 6. Updated `INVENTORY.md` and removed internal Prisma import.

**My approved comment:**
> All review findings have been resolved cleanly:
>
> - Selects remain disabled upon reference-data load failures (`ui-spec.md §5.2`).
> - Cancel button is positioned on the left and Submit on the right on desktop/tablet (`ui-spec.md §5.2`).
> - Classification group renders in a 2-row layout on tablet viewports (769px–991px).
> - Attachment validation checks both extension and MIME type (`specification.md` BR-06).
> - Ticket number sequence derivation uses `findFirst` instead of loading all year records into memory (`specification.md` AD-08).
> - `INVENTORY.md` and Prisma error handling updated to standard patterns.
> - All 72 tests (41 server, 31 client) and production builds pass.  
> Approved! LGTM.

---

### feature/9-my-tickets #49

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/49>

**My comment:**
> Overall looks great! All 74 server tests and 45 client tests pass, and ownership isolation/pagination work properly. Just a couple of spec-alignment fixes needed before merging:
>
> 1. **Search debounce triggers on every keystroke (`MyTickets.tsx`):** `setFilters` is called synchronously outside `setTimeout`, bypassing the 300ms debounce and fetching on every keystroke. Fix: keep local state for search input and only update `filters.search` inside debounce timeout.
> 2. **Use `<Badge>` in desktop table (`TicketTable.tsx`):** Desktop table renders plain text for Priority and Status. Wrap in `<Badge>` component.
> 3. **Empty & No-results icons (`MyTickets.tsx`):** Per `ui-spec.md` §5.3, add icons (`Inbox` / `SearchX` from `lucide-react`) to empty and no-results states.

**Partner's response:**
> Changes addressed spec-alignment fixes and responsive layout improvements:
>
> 1. **Search debounce:** Added `searchInput` local state; `filters.search` now only updates inside 300ms debounce timeout; cleared on unmount and filter reset.
> 2. **Badge in desktop table:** Wrapped `requestedPriority`, `itPriority`, and `currentStatus` in `<Badge>`.
> 3. **Empty & No-results icons:** Added `Inbox` and `SearchX` from `lucide-react`.
> 4. **Responsive filter rows:** Cleaned up desktop/tablet inline flow and mobile 2-row grid. All 45 client tests pass.

**My approved comment:**
> LGTM! All requested changes (search debounce, desktop table badges, and empty-state icons) have been cleanly addressed. All tests pass across server and client. Approved! 🚀

---

### feature/10-ticket-detail #50

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/50>

**My comment:**
> Great work on the Requester Ticket Detail view! The read-only layout, ownership verification returning `403` with safe error masking, badge mapping, and route wiring from Create Ticket / My Tickets are implemented cleanly.
>
> There are a few test fixes and consistency alignments to address before merging:
>
> 1. **Fix broken client test assertion (`client/tests/lab-02/RequesterTicketDetail.test.tsx`):** In `140fdc7`, `TicketDetail.tsx` was updated to use Lucide's `<ArrowLeft size={16}/> My Tickets`, but the test is still matching the unicode arrow `\u2190 My Tickets`. Fix: update query to match link by role.
> 2. **Foreign key constraint error in server test cleanup (`server/tests/lab-02/ticket-detail.api.test.ts`):** `db.ticket.delete` fails with FK violation (`Attachment_ticketId_fkey`) because the attachment created in the test still references the ticket. Fix: clean up attachment records before deleting ticket.
> 3. **Standardize back-link arrow across fallback states (`client/src/TicketDetail.tsx`):** Main view uses Lucide icon, while fallback states use `&larr;`. Standardize to `<ArrowLeft size={16}/>`.
> 4. **Attachment order test assertion (`server/tests/lab-02/ticket-detail.api.test.ts`):** `api-spec.md` §2.6 specifies attachments must be ordered by `createdAt` ascending. Add explicit assertion in `API-11`.

**Partner's response:**
> Thanks for the thorough review! All four items addressed:
>
> 1. **Back link test assertion:** Updated query to `screen.getByRole("link", { name: /my tickets/i })`.
> 2. **FK constraint in test cleanup:** Added `deleteMany` for attachments before deleting the ticket in test and `afterAll`.
> 3. **Back link arrow consistency:** Replaced `&larr;` with `<ArrowLeft size={16} />` in all fallback states.
> 4. **Attachment order assertion:** Added regression assertion in `API-11` verifying attachments are ordered by `createdAt` ascending.
> Also resolved `TS2322` build error in `server/src/app.ts`. Client passes 54, server passes 81.

**My approved comment:**
> LGTM

---

### feature/11-attachments #51

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/51>

**My comment:**
> Nice work on implementing the attachment upload, download, and soft-remove lifecycle! Test coverage is comprehensive (197 tests passing), build is clean, and UI states are well-handled. Before merging:
>
> **Blockers (Must Fix):**
>
> 1. **Race Condition & Stale Closure on Multi-file Upload (`AttachmentSection.tsx`):** Multiple unawaited uploads run concurrently. When they finish, `onUpdate([...attachments, newAttachment])` captures a stale `attachments` array from closure, causing second upload to overwrite first. Fix: upload staged files sequentially with `await` per AD-03.
> 2. **MIME & File Extension Cross-Validation Mismatch (`server/src/app.ts`):** Multer validates MIME type and extension independently, allowing invalid combinations (e.g. `.pdf` with `image/png`). Fix: cross-validate MIME strictly against matching extension (BR-06 / UNIT-02).
> 3. **Internal `storageFileName` Leaked in Ticket Detail (`server/src/app.ts`):** `GET /api/tickets/:id` query includes `storageFileName: true` in Prisma select. Remove per `api-spec.md` §2.6 and AD-09.
>
> **Suggestions & Minor Cleanup:**
>
> - Remove unspec'd endpoint `GET /api/tickets/:id/attachments`.
> - Consolidate `formatFileSize` and `formatBytes` into `client/src/lib/format.ts`.
> - Remove dead code (`UploadEntry`, unused `useCallback`).

**Partner's response:**
> Thanks for the thorough review! All 3 blockers and suggestions are addressed in commits `2dfefcc` and `69ba988`:
>
> 1. **Race condition on multi-file upload:** Fixed. Uploads now run sequentially with `await` per AD-03.
> 2. **MIME & extension cross-validation:** Fixed. `server/src/app.ts` now calls `validateAttachmentType(mimetype, ext)`.
> 3. **`storageFileName` leak:** Fixed. Removed `storageFileName` from `GET /api/tickets/:id` Prisma select.
> 4. Removed unspec'd endpoint, removed dead code, and consolidated file formatting helpers into `client/src/lib/format.ts`.

**My approved comment:**
> LGTM!

---

### feature/12-e2e-visual #52

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/52>

**My comment:**
> Great work delivering the Playwright E2E and visual test infrastructure for Lab 2! Covers full happy-path lifecycle, cross-requester isolation, and offline resilience. Findings & suggestions:
>
> 1. **Assert Table-to-Card Responsive Transformation (`responsive.visual.spec.ts`):** Combined selector accepts either table rows or mobile cards without asserting that the table actually switches to cards on mobile. Add explicit visibility assertions based on project viewport (`.ticket-cards-mobile` visible on mobile, `.ticket-table-desktop` visible on larger viewports).
> 2. **Accessible Names on Truncated Mobile Buttons (`Navbar.tsx`, `AttachmentSection.tsx`):** `display: none` at `@media (max-width: 768px)` removes text from accessibility tree, truncating screen-reader names from "Change Requester" to "Change" and "Add attachment" to "Add". Add explicit `aria-label`s.
> 3. **Filter Bar Label Consistency (`MyTickets.tsx`):** Label shortened from "Requested Priority" to "Priority". Document intentional UI polish in `ui-spec.md` §5.3.
> 4. **Update `AGENTS.md` Line 5:** Update to reflect that root `package.json` is dedicated to Playwright E2E tooling.
> 5. **Code Cleanliness & Test Helper Sharing:** Extract shared PNG buffer and ticket creation helper to `e2e/lab-02/helpers.ts`, and rename `REQUIRE` to `TEST_REQUESTERS`.

**Partner's response:**
> Thanks for the review. Addressed all 5 points:
>
> 1. **Table vs Card check:** Added check so cards are visible and table hidden on mobile, and vice versa on larger screens.
> 2. **Button names for screen-readers:** Added `aria-label="Change Requester"` and `aria-label="Add attachment"`.
> 3. **"Priority" label:** Documented reason for shortening label in `ui-spec.md`.
> 4. **`AGENTS.md`:** Updated to state root `package.json` exists for Playwright/E2E.
> 5. **Shared helpers:** Moved shared helpers into `e2e/lab-02/helpers.ts` and renamed `REQUIRE` to `TEST_REQUESTERS`.

**My approved comment:**
> LGTM!

---

### feature/13-release-docs #53

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/53>

**My comment:**
> Thanks for putting together the sprint-close PR and locking in the 45 E2E/visual test evidence and peer-review screenshots! Findings:
>
> 1. **Functional Bug: Invalid CSS property `-line-clamp: 2;` (`client/src/App.css:605`):** Missing vendor prefix. Fix: `-webkit-line-clamp: 2; line-clamp: 2;`.
> 2. **Architecture Violation: Reusable component styles duplicated in `App.css` (`lines 187–207`):** `.field-footer`, `.field-error-msg`, and `.field-counter` duplicated in `@layer layout` instead of remaining exclusively in `@layer components` in `index.css`.
> 3. **Test Stderr Noise: Remove `css: true` from Vitest config (`client/vite.config.ts:20`):** jsdom cannot parse `@layer`, causing error output.
> 4. **Sprint-Close Housekeeping:** Update README with 3 specs across 3 viewports, check Definition of Done boxes in `specification.md`, and update `tests.md` approval count to 45 passed.

**Partner's response:**
> Thanks for the careful review! All set except item 3 — details below:
>
> 1. **`-line-clamp`:** Corrected to `-webkit-line-clamp: 2` + `line-clamp: 2` in `App.css`.
> 2. **Duplicated field styles:** Removed `.field-footer` / `.field-error-msg` / `.field-counter` from `App.css`.
> 3. **`css: true`:** Kept `css: true` with evidence: removing it dropped test pass count from 77/77 to 73/77 because STYLE tests rely on injected `<style>` tag textContent. The stderr lines are jsdom warnings, not app errors.
> 4. **Housekeeping:** Updated README, checked DoD boxes in `specification.md`, updated `tests.md` approval line to 45 passed.

**My approved comment:**
> lgtm

---

### lab2-staging → main #54

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/54>

**My comment:**
> LGTM!

**Partner's response:**
> Merged into `main`.
