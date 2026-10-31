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
