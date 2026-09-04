# Lab 2 Peer Review Record

Filled in as PRs are opened and reviewed. Each feature branch enters `lab2-staging`
through a peer-reviewed Pull Request; `lab2-staging` enters `main` through one release PR.
No commit is made directly on either integration branch.

**Reviewer identity:** `@fahsai-02` (GitHub: [`fahsai-02`](https://github.com/fahsai-02))

## Pull Requests

| Issue | Branch | PR | Reviewer | Comments given | Comments received | Response | Approved |
|---|---|---|---|---|---|---|---|
| 5 | `feature/5-lab2-contract` | [#10](https://github.com/thrxpt/toktickit/pull/10) | `@fahsai-02` | 0 | 2 | Fixed planned count (71) and FR-09 BR citation (BR-28) | Yes |
| 6 | `feature/6-data-model-seed` | [#20](https://github.com/thrxpt/toktickit/pull/20) | `@fahsai-02` | 0 | 1 | Linked issue in Development tab | Yes |
| 7 | `feature/7-app-shell-theme` | [#21](https://github.com/thrxpt/toktickit/pull/21) | `@fahsai-02` | 0 | 2 | Added UI-22..25 to tests.md; added visible focus ring; read-only input | Yes |
| 8 | `feature/8-requester-context` | [#22](https://github.com/thrxpt/toktickit/pull/22) | `@fahsai-02` | 0 | 1 | Confirmed criteria met, error envelope consistent, seam preserved | Yes |
| 9 | `feature/9-create-ticket` | [#23](https://github.com/thrxpt/toktickit/pull/23) | `@fahsai-02` | 0 | 4 | Clarified standalone sequence behavior; updated conflict message | Yes |
| 10 | `feature/10-my-tickets` | [#24](https://github.com/thrxpt/toktickit/pull/24) | `@fahsai-02` | 0 | 2 | Added AbortController to prevent race condition; handled null requester | Yes |
| 11 | `feature/11-ticket-detail` | [#25](https://github.com/thrxpt/toktickit/pull/25) | `@fahsai-02` | 0 | 2 | Acknowledged ReadOnlyField usage and 404 query diagnostics | Yes |
| 12 | `feature/12-attachments` | [#26](https://github.com/thrxpt/toktickit/pull/26) | `@fahsai-02` | 0 | 7 | Sanitized semicolons, nosniff header, async exists, preview modal a11y | Yes |
| 13 | `feature/13-e2e-visual-release` | _current_ | `@fahsai-02` | 0 | 0 | Full E2E and responsive test suites, 25 screenshots, release verification | Pending |
| — | `lab2-staging` → `main` | _pending_ | `@fahsai-02` | 0 | 0 | Final Lab 2 release PR | Pending |

## Review notes

### PR #10 (Issue 5: Lab 2 Engineering Contract)

- **Comments received:**
  1. *Test count mismatch*: PR description noted "66 planned tests" while `tests.md` §6 totaled 71 (excluding responsive rows).
  2. *FR-09 BR citation*: `specification.md` cited BR-23 instead of BR-28 for sortable fields.
- **Resolution:** Updated PR description to break out 5 responsive tests (total 71 tests). Updated `specification.md` line 78 to cite `BR-28` (commit `d045755`).

### PR #20 (Issue 6: Data Model, Migration, and Seed)

- **Comments received:** Reviewed schema, migration, seed, and endpoints; requested linking the issue in the Development tab.
- **Resolution:** Issue linked in Development tab; PR approved and merged.

### PR #21 (Issue 7: App Shell, Routing, and Theme)

- **Comments received:**
  1. *Traceability gap*: Four test files (`AppRoutes.test.tsx`, `StateBlock.test.tsx`, `ConfirmDialog.test.tsx`, `Pagination.test.tsx`) were missing from `tests.md` §2.
  2. *Visible focus ring (AC-45)*: `.zen-nav-link` and `.zen-brand` lacked `--zen-secondary` focus outline.
  3. *Read-only FormField*: Recommended standard `<input readOnly>` over `<div>` with `aria-readonly`.
- **Resolution:** Added rows `UI-22` through `UI-25` to `tests.md` (updating UI planned count from 21 to 25, grand total from 72 to 76). Added explicit `:focus-visible` ring in `theme.css`. Updated `FormField.tsx` to `<input readOnly tabIndex={-1}>`.

### PR #22 (Issue 8: Requester Context)

- **Comments received:** Verified all acceptance criteria met, error codes match API spec, and seam preserved without blocking issues.
- **Resolution:** Approved and merged.

### PR #23 (Issue 9: Create Ticket)

- **Comments received:**
  1. *RESTART IDENTITY in truncate*: Pointed out that standalone sequence `ticket_number_seq` does not reset with `TRUNCATE ... RESTART IDENTITY` because it is not owned by a table column.
  2. *Error message contradicts design*: `TICKET_NUMBER_CONFLICT` message suggested "Please try again", which invited retrying when conflicts should not happen.
  3. *Inconsistent fetch usage*: `CreateTicket.tsx` used raw `fetch` for categories/related-systems while using `apiFetch` for tickets.
- **Resolution:** Documented standalone sequence behavior. Updated conflict error message to safe non-retryable text (`"A ticket number conflict occurred. Please contact support."`). Documented that categories and related systems are public reference data endpoints not requiring requester context.

### PR #24 (Issue 10: My Tickets)

- **Comments received:**
  1. *Race condition*: `fetchTickets` lacked `AbortController`, risking out-of-order responses overwriting updated filter states.
  2. *Loading spinner*: Null `selectedRequester` returned before calling `setLoading(false)`.
- **Resolution:** Wrapped API requests in `AbortController` aborting in-flight requests on dependency change and ignoring `AbortError`. Added `setLoading(false)` on null requester and wired retry counter with regression tests (`7993ebb`).

### PR #25 (Issue 11: Ticket Detail)

- **Comments received:**
  1. Advised that `FormField.readOnly` was superseded by `ReadOnlyField` component to prevent future tab traps.
  2. Noted diagnostic `findUnique` query in 404 handler.
- **Resolution:** Acknowledged; `ReadOnlyField` is used for all Ticket Detail fields.

### PR #26 (Issue 12: Attachment Lifecycle)

- **Comments received:**
  1. `isImageAttachment` was overly broad with `mime.startsWith("image/")`.
  2. `formatContentDisposition` did not strip semicolons, creating potential parameter injection in headers.
  3. `serializeRemovedAttachment` silently defaulted `removedBy` to `uploadedBy`.
  4. `formatIsoString` defaulted missing dates to `new Date()`.
  5. Content streaming endpoint lacked `X-Content-Type-Options: nosniff`.
  6. `attachmentFileExists` used synchronous `fs.existsSync` in async route.
  7. Image preview modal did not trap focus or handle `Escape` key (`ui-spec.md` §3).
- **Resolution:** Narrowed allowed image types, stripped semicolons in disposition formatter, removed silent fallbacks, added `nosniff` header, converted existence check to `fs.promises.access`, and implemented focus trap and Escape handler on preview modal (`5546073`, `55eb92a`).
