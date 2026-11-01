# Lab 4 AI Use

**LLMs used:** GLM 5.3 Flash (`opencode/glm-5.3-flash-free`) for the initial
requirements/specification work and DeepSeek V4.1 Flash
(`opencode/deepseek-v4.1-flash-free`) for the contract drafting and initial fixes,
via the OpenCode agent harness. GPT-6.1 Sol (`gpt-6.1-sol`) via the Codex harness
in T3 Code verified the peer review and prepared the follow-up contract fixes.
These identifiers are taken from the recorded session metadata; no additional
model build/version is claimed.

Lab 4 turns the working multi-role service desk into a finished product: the work
log (Actions Taken), the final Ticket lifecycle, role dashboards, and a hardening
pass over everything Labs 1–3 shipped. AI assistance stays under the same
Spec-Driven Development and test-first discipline as earlier labs — the contract is
written and merged before code, every rule carries an ID, and nothing is accepted
without automated proof and peer review.

This file is a living record. The rows below cover the contract Issue (#49) that
opens the Lab; later Issues append their own prompts and outcomes rather than
rewriting history.

## Key Prompts

| # | Prompt | Outcome |
| --- | --- | --- |
| 1 | `/implement #49` — "Write the Lab 4 engineering contract" | Fetched the Issue and read the Lab 3 contract set (`specification`, `api-spec`, `ui-spec`, `tests`) in full to mirror its house format, numbering, error envelope, and test seams before writing a line. |
| 2 | "Read `server/src/tickets/status-machine.ts`, `server/src/errors.ts`, `server/prisma/schema.prisma`, and `client/src/App.tsx`; quote what actually exists" | Rejected a paraphrase-first contract. The transition matrix, the live error codes, and the remaining Lab 2 vestiges (`/select-requester`, `/api/requesters`) were quoted from code, which is what made the contract's later corrections possible. |
| 3 | "The seed is reference-data only by design — how does the handout's demo-data requirement change that?" | Surfaced a real conflict: `seed-data.ts` deliberately excludes transactional rows, but the handout requires demo Tickets and Actions Taken. Resolved as D-27 with an idempotent transactional seed, `ActionTaken`-before-`Ticket` truncation order, and E2E cleanup that restores the baseline. |
| 4 | "Handout §4.3 has Administrators performing IT Staff behavior; ADR-0008 forbids it. Decide, don't average." | Forced a single authoritative stance instead of a compromise: ADR-0010 supersedes ADR-0008 in one direction (Administrators gain ticket operations; IT Staff still cannot manage users), with the superseded clause marked in place. |
| 5 | "Define dashboard metrics so each card's drill-down returns exactly the set it counted" | Produced the metric tables plus the `statusGroup=open|resolved` list parameter, because a five-status "open" count cannot drill down through a single-status filter. Caught an inconsistency between the count definition and the link. |
| 6 | "Design the concurrency contract: what exactly is versioned, what is not, and what the client sees" | Chose an integer `Ticket.version` with `expectedVersion` on every Ticket-owned mutation and `409 STALE_UPDATE`; Public Comments and Internal Notes are append-only and deliberately outside the guard. Actions Taken writes are version-guarded too, so a double-click cannot create two rows. |
| 7 | "Write the test plan from the contract, before implementation, with full AC traceability" | Produced 50 planned IDs across UNIT, API, UI, STYLE, RESP, E2E, and a regression row, each with a file path and expected result. Every AC-01..AC-26 maps to at least one planned test; numbering restarts for Lab 4. |
| 8 | Two-axis code review over the contract diff (Standards and Spec, in parallel) | Caught what self-review missed: a dashboard drill-down that did not match its count, `version` vs `ticketVersion` naming drift, a stale `§7` citation, `CLOSED → REOPENED` wrongly described as terminal, and two mandated documents (`reviewer.md`, `ai-use.md`) missing from the deliverable. All were fixed in the PR before review. |
| 9 | "My peer reviewer is already give the comment. Please check and verify whether it meets the requirements." Then: "If it's valid you can fix this with new commit." | Independently checked the peer's four blockers against the contract and code, then corrected session-only retirement, unique seed keys, drill-down parameters/client handling, and transactional version guards. Added rollback/identity/drill-down test-plan coverage (54 planned IDs), documented index decisions, and recorded Changes requested without claiming approval. |

## My Reflection

### 1. The contract is where contradictions are cheapest to fix

Every ambiguity in a contract becomes two implementations later. The clearest
example was the dashboard drill-down: the contract defined "Open Tickets" as five
statuses, then linked the card to a single-status filter. Both halves read fine in
isolation. Only when I compared the metric table against the query parameters did
the mismatch appear — and fixing it took one new list parameter instead of a
rewritten dashboard in Issue 27.

The same pattern appeared with the seed. The existing seed is deliberately
reference-data only, with a comment saying transactional data is never seeded. The
handout asks for demo Tickets. An AI that "helpfully" adds Tickets to that file
without touching the comment leaves the codebase lying to its next reader. Naming
the contradiction (D-27) and updating the test harness in the same contract is the
only version that stays true.

### 2. Inventory before invention

The most useful prompts were the least creative ones: read the status machine, the
error codes, the schema, the routes. The matrix in
`server/src/tickets/status-machine.ts` is the authority for BR-15, and quoting it
directly meant the contract could not drift from the code it describes. Similarly,
reading `errors.ts` showed that `INVALID_QUERY_PARAMETER` already exists, so the
contract introduces only `STALE_UPDATE` and `ACTION_TAKEN_NOT_FOUND` and says so
explicitly.

AI is very willing to invent a plausible API. The only defence is reading the one
that exists.

### 3. Superseding a decision is a writing task, not a deleting task

ADR-0008 said Administrators cannot operate the queue. The handout says they must.
The tempting move is to rewrite ADR-0008. That destroys the record of why the
separation existed and makes the reversal invisible to a future reader. Instead,
ADR-0008 keeps its text and gains a pointer to ADR-0010, which states precisely
which clause it replaces and which clauses still stand. A decision record's value
is its history, not its current correctness.

### 4. Review with axes, not opinions

The two-axis review (Standards against the repo's own rules, Spec against the Issue
and handout) found different classes of defect, which is why running them in
parallel rather than as one pass mattered. Standards caught the stale `§` citations,
the missing `lab4-staging` git-flow update, and a glossary that still claimed
Administrators do not manage Tickets. Spec caught the missing mandated documents
and the untested rollback path. Neither list would have been complete alone.

### 5. What stays human

Two judgement calls were mine, not the model's: that the Development Requester must
be fully removed now rather than kept for convenience (D-28), and that the
"recently" metric must be list length rather than a date window (D-26), because a
date window drags time zones and clock control into tests for no requirement's
benefit. The model produced defensible arguments for several alternatives. Choosing
between defensible alternatives is the job.

## Issue 23 / GitHub #50 — Ticket version and conflict handling

GPT-6.1 Sol via Codex in T3 Code implemented #50 against BR-11, BR-12, BR-27,
AC-08, and AC-20. The user confirmed the REST API and Ticket Detail UI seams and
starting commit `fc6ff38` for review. API tests demonstrated the missing version
and unguarded resolution indication before implementation; UI tests demonstrated
the missing Requester conflict recovery before implementation.

The implementation uses a conditional PostgreSQL write with an atomic version
increment. Conflict reload keeps the existing discussion editors mounted and
retains the pending Staff choice for an explicit retry. Legacy tests gained the
required version fields while retaining their behavior and authorization checks.
A separate test container isolates all validation from development data. A manual
upgrade of a populated Lab 3 schema preserved the Ticket and Comment and initialized
the Ticket version to zero. Actions Taken, final lifecycle changes, Administrator
ticket access, dashboards, and identity retirement remain with their later Issues.

### Issue 23 review and validation

- **Standards:** one documented finding fixed: ConflictAlert now overrides
  Bootstrap's alert variables with `--zen-danger-bg` / `--zen-danger` in
  `theme.css`. The pending-choice alert uses the corresponding warning tokens.
  A rendered Chromium computed-style check confirmed the conflict colors. One
  optional Repeated Switches heuristic was retained: the three explicit operations
  remain small and do not need an operation-descriptor abstraction.
- **Spec:** no findings against #50 and its Lab 4 contract requirements.
- **Final automated validation:** 418 tests passed, zero skipped (149 client,
  269 server); root typecheck and both package builds passed; existing Lab 3 Staff
  E2E journey passed, including sequential owner/priority/status writes.
- **Runtime:** the final full suite used Node 24.18.0 with
  `NODE_OPTIONS=--no-experimental-webstorage` so jsdom supplies test storage.
  Earlier Node 26 runs included a green full suite and intermittent unrelated
  authentication-test failures; no authentication assertions were changed.

## Issue 25 — Actions Taken UI (#52)

User prompt: `$implement #52`, using the supplied implement skill (TDD at the
contract's UI/E2E seams, code review, and commit). Implemented by GPT-6.1 Sol in
T3 Code. Work started from merged `origin/lab4-staging` at `26cc067` on
`feature/25-actions-taken-ui` because integration branches accept reviewed PRs only.

The first read-only UI test failed for the missing panel, then passed; the next
create/edit tests failed for missing controls before implementation. Tests exercise
rendered forms and HTTP payloads, not reducers or Prisma internals. The existing
API enforces ownership, role restrictions, and duplicate retry rejection.

Parallel Standards and Spec reviews found focus restoration before the React
commit, missing Enter switch handling, the collapsed Attachment Notes preview,
and timestamp wrapping. All were corrected. Render inspection also caught the
existing multiline read-only class applying block layout and minimum height to
work-log table cells; a scoped whitespace class preserves table semantics and
compact mobile text. These automated reviews supplement the required human peer
review; they do not certify it. No new runtime dependency was added.

### Issue 25 human review follow-up (#59)

User prompt: `Push fixes.` Verified the peer review against the PR head. Corrected
Bootstrap specificity hiding the switch focus ring and its unchecked blue focus
knob, strengthened duplicate-submit and counter assertions, matched API validation
copy, and made network/non-JSON save failures use safe recovery text. The focused
network and HTML-500 tests failed with raw browser/parser messages before the fix.
Keyboard focus is restored after unsuccessful saves, without overriding focus the
user moved elsewhere. Chromium checks both switch states and failed-save focus.

The Actions Taken reload now reuses the Ticket Detail loader, including assignees
and not-found handling. Requester section ordering, import placement, conflict
style assertions, and test source-path resolution were adjusted. The lost-response
retry boundary is documented in tests.md. No reviewer reply or merge was performed.

## Issue 26 — Final Ticket workflow (#53)

User prompt: `$implement #53`. GPT-6.1 Sol through Codex in T3 Code implemented
against FR-07–FR-09, AC-08–AC-11, AC-20, AC-23, and ADR-0010. The user confirmed
HTTP, rendered Ticket Detail, and Chromium as the test seams, and starting commit
`1575620a44cb559f080c8ddbec421877d263b2bb` as the review base.

Tests first demonstrated the missing server transition payload, Administrator
role denial, client-derived choices, stale options after status success, missing
terminal explanation, invalid retry after reload, and incorrect Administrator
owner display. The final matrix was already correct server-side; implementation
keeps that authority and removes the duplicate client matrix. Owner/status
responses add permitted transitions so the UI updates choices immediately along
with status and version. The API/spec contract records that additive response.

Chromium exercised creation, advisory resolution, a real two-session stale write,
reload with preserved discussion draft, formal resolution/closure, reopening,
and cancellation. Screenshot inspection caught the Administrator owner missing
from the IT-Staff-only assignment options. A disabled current-owner option fixes
the display without widening assignment targets. Stable discussion count callbacks
also keep preserved editors from repeatedly fetching their threads during status
changes. Local verification uses an isolated `_test` database and git-ignored
configuration; no credentials are tracked. Automated review supplements human peer
review and does not certify a peer verdict.

### Issue 26 review and validation

Parallel Standards and Spec reviews compared the implementation to starting commit
`1575620a44cb559f080c8ddbec421877d263b2bb`. Standards: zero documented violations
and zero actionable smell findings. Spec: zero missing, incorrect, or out-of-scope
requirements for #53. The full unit/API/UI/style suite passed: 317 server and
168 client tests, zero skips. Production build, root/server typechecking, and
headless Chromium E2E-02 passed. Three workflow screenshots were inspected after
fixing Administrator owner display; the UI detector reported no findings. These
are automated checks, not the human peer-review verdict tracked in reviewer.md.

### Issue 26 human review follow-up — #61

User prompt: "Check request changes comment. If it's valid, just fix it."
Fact-checked @fahsai-02's review on `698fbdd` against the API, UI and contract.
Confirmed the Administrator reassignment gap and replaced the narrower assignee
contract with active operational-role targets. The new API test failed for the
missing Administrator before the endpoint change. Both Staff assignment and Admin
takeover of an already-owned Ticket now pass in Chromium. Restored the originally
planned Lab 4 UNIT-02 file instead of repointing it to Lab 3 evidence.

A rendered test reproduced the silent unpermitted-status return; the guard now
gives recovery feedback without writing. Cancellation remains terminal for status
only, as BR-15 specifies. Documented the full disposable-database E2E override and
ran it against fresh `toktickit_review_test` while leaving `server/.env` unchanged;
all migrations, both journeys and cleanup succeeded. The review exposed gaps that
the earlier automated reviews missed. These fixes do not imply a new human review
verdict, and no reviewer reply was posted.

Review-fix validation (2026-10-31): 326 server and 169 client tests passed (495
in total, zero skips), as did the production build/typechecks and both Chromium
E2E-02 journeys. The disposable-database reproduction applied all five migrations
from an empty database. Review feedback and classifications are recorded in
reviewer.md; the PR retains its existing Changes Requested verdict pending a new
human review.

## Issue 27 — Role dashboards (#54)

Implemented against the four Lab 4 contract documents: session-scoped Requester
metrics, shared operational metrics with Administrator accounts, dashboard
navigation and landing routes, reusable MetricCard/DashboardList components,
Requester grouped-status drill-downs, URL-synchronized User Management filters,
and additive recent-read indexes with rollback SQL. The Administrator queue and
Ticket Detail guards adopt ADR-0010 so dashboard drill-downs work end to end.
Legacy identity retirement and Actions Taken UI remain with their owning Issues.

TDD used the contract's HTTP, rendered-component/navigation, and Chromium seams.
Separate Standards and Spec reviewers inspected the staged implementation against
starting commit `26cc067`. Findings were corrected: sessionless dashboard redirect
when legacy storage survives, role-shaped loading sections, retained unavailable
metric frames with retries, and 44 px recent-list drill-down targets. The reviews
reported no unrelated scope additions or further smell findings.

Validation: `NODE_OPTIONS=--no-experimental-webstorage pnpm test` passed 461 tests
(159 client, 302 server), zero skipped. `pnpm typecheck`, `pnpm build`, and
`pnpm test:e2e:lab4` passed. The Chromium journey includes all three roles,
Requester grouped/recent list destinations, Administrator account-role and Total
links, Administrator queue access, a zero-Ticket Requester, and mobile overflow.
Desktop and 390 px mobile dashboard screenshots were visually inspected. The
Impeccable mechanical detector returned no findings. Verification used a separate
local PostgreSQL container; API tests used `toktickit_test`, never development data.

### Issue 27 human review follow-up — #60

User prompt: "Check my partner comment. If it's valid, you can fix."
Fact-checked @fahsai-02's review on `aca4cab` against merged head `f303ed7`.
The earlier merge already incorporated Administrator attachment access, active
operational-role assignment targets, the dedicated Lab 4 Playwright configuration,
and both Issues' documentation. Restored the default Lab 3 E2E discovery scope;
the legacy identity retirement remains with Issue 28.

Two rendered assertions failed for skipped metric heading levels and duplicate
retry controls before the fixes. Metric labels now use caption paragraphs, and
the accessible error summary retains per-card retry without a second page retry.
Applied the specific formatting requests. Extended E2E-03 to follow an Administrator
dashboard Ticket link and download its attachment, and saved its desktop/mobile
screenshots as committed evidence. The review classifications and remaining
read-committed consistency limitation are recorded in reviewer.md and tests.md.

Verification: 23 focused client tests, the production build/root typecheck, and
isolated headless Chromium E2E-03 passed. Screenshot inspection and the UI detector
found no new layout or mechanical issues. No GitHub reply was posted; the human
Changes Requested verdict still requires human re-review.

### Issue 27 re-review follow-up — #60 (R1)

User prompt: "Check reviewer comment. If it's valid, you can fix."
Checked @fahsai-02's re-review on `abe67f7` against the current contract and code.
Reproduced the Requester login timeout in E2E-01, then updated all eight outdated
post-login waits in E2E-01/E2E-02 to the shared `/dashboard` landing page. Existing
journey assertions remain intact. Adopted the account-label casing suggestion;
UI-12 failed first, then passed with title-case captions and unchanged role URLs.
Updated E2E-03's caption locator and regenerated the two dashboard screenshots.

All four Lab 4 Chromium journeys passed against the exported test-database URL,
along with ten focused dashboard client tests, eight UNIT-02 setup-probe cases,
and the production build/root typecheck. Visually inspected the dashboard evidence.
The alleged fixture residue is already handled by existing teardown: five Tickets
and one Attachment were deleted, and direct queries confirmed no E2E Tickets or
Attachments remained. No cleanup code change was necessary. Legacy E2E was not
rerun; Issue 28's retirement inventory remains intact. Recorded classifications
and a draft reply in reviewer.md; no new GitHub reply or approval was posted.

## Issue 28 — Final regression and release preparation (#55)

User prompt: `$implement #55`. The user confirmed the existing HTTP, rendered UI,
and Playwright seams and review base `1ae9137`. GPT-6.1 Sol via Codex in T3 Code
traced authentication, every mutation entry point, recovery state, existing tests,
and the four Lab 4 contract documents before implementation.

Tests first reproduced the live Requester directory/header fallback, duplicate
same-event account/comment/note submissions, duplicate records on network retries,
and failed Logout's unhandled promise. The implementation retires identity
compatibility, preserves drafts, and adds nullable unique submission keys for the
four unversioned creates. API tests exercise concurrent/sequential retries; the
browser tests commit upstream and abort delivery before retrying from retained UI
state. An additive migration/reverse preserves existing records. No dependency
was added. The new key/index storage is the necessary cost of retry safety across
lost responses and server restarts, rather than an in-memory cache.

The complete run exposed old E2E assumptions that isolated runs missed: a removed
Admin confirmation control, a zero-data account used by an earlier lab, and
unprefixed fixture summaries. A cleanup test also proved file bytes were left
behind after row deletion. Those paths are corrected without weakening Ticket,
authorization, status, or attachment assertions. Shared HTTP listeners replace
per-request listener churn after intermittent connection resets in combined API
runs; no retry or skip masks those failures.

Rendered inspection found Bootstrap suppressing the shared input outline and
cramped tablet work-log headings. Theme specificity, tablet typography/padding,
and mobile target sizes address those findings while preserving Zen Green.
57 release screenshots cover three widths. Validation and the remaining human
release gates are recorded in [release.md](release.md); neither automated checks
nor agent review stand in for peer approval or integration-branch verification.

The final parallel Standards and Spec reviews of `1ae9137...70d8891` each reported
zero actionable implementation findings. Their separate reports are preserved in
reviewer.md. Final verification passed 332 server and 181 client cases, 29
Chromium journeys, and the production build. A tooling-only test option and the
mobile profile button's width were corrected during final QA; focused rendered
checks cover the latter. The peer-reviewed integration/release gates remain open.

### Issue 28 — human review corrections (2026-11-01)

User prompt: `Can you fix?`, following @fahsai-02's COMMENTED review of PR #62
on `1a53155`. GPT-6.1 Sol via Codex fact-checked all nine inline findings against
the contract and HTTP/rendered UI behavior. Temporary reproduction checks showed
which claims held; six rendered regressions and four API regressions then failed
before the fixes. Human review caught expired-session logout, discarded API
messages, mutable-reference replay validation, post-commit file deletion,
File-key lifecycle, and duplicate React keys missed by the automated reviews.

Fixes retain server authorization, BR-33's payload scope, removed-file `404`, and
the atomic attachment limit. Comment/note cancellation replay already worked.
Known-full fresh uploads avoid disk writes and row locks; payload fingerprinting
still needs the bounded upload. Added HTTP checks use a response-serialization
fault, lost commit acknowledgement, and a real database constraint failure to distinguish committed evidence
from rollback cleanup. Rendered checks cover drafts, safe/malformed API envelopes,
expired logout, intentional File reuse, and same-name retry identity.

The existing HTTP API, rendered UI, and Playwright seams remain in use, with review
base `1ae9137`. No dependency, migration, GitHub reply, or agent approval was added.
[reviewer.md](reviewer.md) records classifications and a local reply draft;
[release.md](release.md) records final verification. Human re-review and integration
release gates remain pending.
