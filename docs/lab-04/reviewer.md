# Lab 4 — Peer Review Record

**Author:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt
**Peer reviewer:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02

## Pull Requests I authored (reviewed by my partner)

| Issue | PR | Branch | Latest peer verdict | PR state |
| --- | --- | --- | --- | --- |
| 22 ([#49](https://github.com/thrxpt/toktickit/issues/49)) | [#56](https://github.com/thrxpt/toktickit/pull/56) | feature/22-lab4-contract | [Approved, 2026-10-29](https://github.com/thrxpt/toktickit/pull/56#pullrequestreview-5699573824) | Merged 2026-10-29 |
| 23 ([#50](https://github.com/thrxpt/toktickit/issues/50)) | [#57](https://github.com/thrxpt/toktickit/pull/57) | feature/23-stale-update-guard | [Approved, 2026-10-29](https://github.com/thrxpt/toktickit/pull/57#pullrequestreview-5704764074) | Merged 2026-10-29 |
| 24 ([#51](https://github.com/thrxpt/toktickit/issues/51)) | [#58](https://github.com/thrxpt/toktickit/pull/58) | feature/24-actions-taken-foundation | [Approved, 2026-10-30](https://github.com/thrxpt/toktickit/pull/58#pullrequestreview-5710802852) | Merged 2026-10-30 |
| 25 ([#52](https://github.com/thrxpt/toktickit/issues/52)) | [#59](https://github.com/thrxpt/toktickit/pull/59) | feature/25-actions-taken-ui | [Approved, 2026-10-31](https://github.com/thrxpt/toktickit/pull/59#pullrequestreview-5722170413) | Merged 2026-10-31 |
| 26 ([#53](https://github.com/thrxpt/toktickit/issues/53)) | [#61](https://github.com/thrxpt/toktickit/pull/61) | feature/26-ticket-workflow | [Approved, 2026-10-31](https://github.com/thrxpt/toktickit/pull/61#pullrequestreview-5724299806) | Merged 2026-10-31 |
| 27 ([#54](https://github.com/thrxpt/toktickit/issues/54)) | [#60](https://github.com/thrxpt/toktickit/pull/60) | feature/27-role-dashboards | [Approved, 2026-11-01](https://github.com/thrxpt/toktickit/pull/60#pullrequestreview-5727849545) | Merged 2026-11-01 |
| 28 ([#55](https://github.com/thrxpt/toktickit/issues/55)) | [#62](https://github.com/thrxpt/toktickit/pull/62) | feat/final-release | [Approved, 2026-11-01](https://github.com/thrxpt/toktickit/pull/62#pullrequestreview-5728819835) | Merged 2026-11-01 |

Checked against GitHub PR metadata and submitted reviews on **2026-11-01**.
Ordered by repository Issue 22–28 (GitHub #49–#55). This table covers the seven
authored Lab 4 contract/implementation PRs targeting `lab4-staging`; earlier labs
keep their own review records. Approval links above point to @fahsai-02's actual
submitted verdicts. Merge dates are UTC and are recorded separately from approval.

The change-request and follow-up narratives below are historical snapshots; their
then-pending statements do not override the later approval records. Issues
#49–#55 and parent #48 are closed on GitHub. PR #62 was approved and merged into
`lab4-staging`; [release PR #63](https://github.com/thrxpt/toktickit/pull/63) was
approved and merged into `main`. Documentation PR #64 remains a separate reviewed
follow-up. [release.md](release.md) records execution evidence and outstanding gates.

---

### feature/22-lab4-contract #56

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/56>

**Scope:** The Lab 4 contract only — `docs/lab-04/{specification,api-spec,ui-spec,tests}.md`,
`docs/adr/0010`, the superseded-in-part notes on ADR-0008 and ADR-0009, and the
`CONTEXT.md`/`AGENTS.md` updates the new vocabulary and git flow require. No
application code changes.

**Reviewer comment I received:**

[@fahsai-02's review, 2026-10-29](https://github.com/thrxpt/toktickit/pull/56#pullrequestreview-5694944586)
on head `4b47ce75705dbf5ed2f97399d9e68e4587e66406` requested changes:

1. BR-30 conflicts with ADR-0009's retained `X-Requester-Id` fallback, and the
   retirement inventory/test plan omits legacy identity paths.
2. `(ticketId, description)` cannot be used for Prisma upsert without a unique key;
   descriptions must remain repeatable.
3. Requester dashboard links use the Staff sorting parameters, while client pages
   do not apply `statusGroup` or the Administrator account-role URL filters.
4. Resolution indication is exempted from `expectedVersion` despite FR-06/BR-12;
   ActionTaken writes and Ticket version updates need an explicit transaction and
   rollback/concurrent-writer evidence.

The review also asks for dashboard index decisions, clarity about obsolete test
deletions, a stale Staff-write assertion after resolution indication, verified AI
model attribution, and an updated peer-review record.

**How I responded:**

Prepared a docs-only follow-up on `feature/22-lab4-contract`:

| Review item | Contract correction and planned evidence |
| --- | --- |
| 1 — Session identity | FR-22, BR-30, D-28 and ADR-0009 retire the header fallback in every environment, including attachment content. `tests.md` §5 inventories middleware, provider/storage, client header injection, routes/guards, and legacy tests; API-26/API-28 cover retirement and impersonation rejection. |
| 2 — Seed identity | BR-26 and the model/seed section use a stable nullable unique `seedKey` for demo-action upserts. API-22 verifies stable fixture ids, re-seed convergence, and distinct same-description actions. |
| 3 — Drill-downs | Requester links use `sort`/`order`; Staff keeps `sortBy`/`sortOrder`. My Tickets applies `statusGroup`; User Management applies URL role changes. API-19 covers invalid/conflicting groups, UI-11/UI-12 and E2E-03 cover destination behavior. |
| 4 — Concurrency | Resolution indication requires `expectedVersion`; BR-12/BR-13 and the API contract require one transaction for the Ticket version update and ActionTaken write. API-07 covers concurrent/repeated submissions, API-27 covers rollback, and API-12 proves the subsequent Staff stale-write rejection. |
| Smaller fixes | Spec §7 documents two `updatedAt` indexes; test deletions are explicit, with replacement coverage; AI attribution names the models recorded in the session history. |

This repository record describes the response in the follow-up commit; it is not a
claim that a GitHub reply or a new reviewer verdict has been posted. Application
changes and execution of the 54 planned Lab 4 tests belong to implementation
Issues 23–28.

**Follow-up verification:** `pnpm typecheck` and `git diff --check` pass. Contract
consistency checks confirm 24 FR, 32 BR, 26 AC, 54 unique planned test IDs, complete
AC-to-test traceability, valid local document links, and no dangling rule/test
references. The application/API/E2E suites were not run for this docs-only change;
the new rows remain planned implementation evidence.

**Reviewer approved comment:**

> I re-checked only the four blockers and the diff they touch (`bba8714`), plus the five smaller fixes. All are addressed.

Source: [@fahsai-02's approval, 2026-10-29](https://github.com/thrxpt/toktickit/pull/56#pullrequestreview-5699573824).
The reviewer confirmed the four blockers and five smaller fixes, reran typechecking
and whitespace checks, and checked the contract counts/traceability. No application
suite was required for this docs-only PR.

**Reviewer verdict:**

> Approved by `@fahsai-02` on `bba8714`, 2026-10-29; merged into `lab4-staging`
> on 2026-10-29. The earlier Changes Requested verdict is superseded by the linked
> approval.

---

### feature/23-stale-update-guard #57

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/57>

**Scope:** Issue 23 / #50 — additive `Ticket.version`, required `expectedVersion`
on Ticket-owned writes, atomic stale-update rejection, and conflict/reload UI
preserving unsaved inputs (BR-11, BR-12, AC-08, AC-20).

**Reviewer verdict:** [Approved by @fahsai-02, 2026-10-29](https://github.com/thrxpt/toktickit/pull/57#pullrequestreview-5704764074)
on `95c108e`; merged into `lab4-staging` on 2026-10-29.

The reviewer endorsed the database predicate/atomic increment and retained drafts,
and reported 149 client tests, typechecking, and `git diff --check` passing.
Non-blocking comments covered redundant in-memory version checks, repeated change
wrappers, clearer disabled-resolution feedback after dismissing a conflict, and
preserving UI-09 traceability when Actions Taken arrives. The approval did not
require those observations to become new scope; it also noted that the coupled
API/client version payload changes must deploy together.

### feature/24-actions-taken-foundation #58

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/58>

**Scope:** Issue 24 / #51 — ActionTaken model/migration, authorized create/update/read,
immutable performer and Action Date/Time, conditional Follow-up Note, transactional
Ticket version guards, stable seed keys, and child-first cleanup
(AC-01–AC-08, AC-21, BR-01–BR-13, BR-26–BR-29).

**Reviewer verdict:** [Approved by @fahsai-02, 2026-10-30](https://github.com/thrxpt/toktickit/pull/58#pullrequestreview-5710802852)
on `48813c2`; merged into `lab4-staging` on 2026-10-30.

The review confirms the foundation meets the contract and cites API-01–API-07,
API-22/API-27 and 296 server + 149 client tests with zero skips. It highlights the
operational risk that reverse SQL drops the work-log table and therefore destroys
Actions Taken unless exported or recovered from a pre-migration backup. It also
records transaction atomicity, deterministic ordering, immutable-field validation,
and cleanup scoping as checks to retain. Those risks/suggestions are recorded as
such; this entry does not invent additional follow-up commits or claim a separate
reviewer test run beyond the review's stated evidence.

### feature/25-actions-taken-ui #59

[@fahsai-02's review, 2026-10-31](https://github.com/thrxpt/toktickit/pull/59#pullrequestreview-5721594365)
on `16da3db` was submitted as `COMMENTED`, with two requested pre-merge fixes:
visible Follow-Up switch focus and explicit duplicate-submit coverage. Both were
verified and corrected. The update also addresses safe error copy, API validation
wording, failed-save focus, shared reload behavior, and the small presentation/test
nits. The lost-response retry limitation is documented. Rendered Chromium checks
exercise focus in both switch states, a double-click with one POST/action, and
failure recovery. Approval and merge were pending at that follow-up. The later human verdict below
supersedes that snapshot.

**Latest reviewer verdict:** [Approved by @fahsai-02, 2026-10-31](https://github.com/thrxpt/toktickit/pull/59#pullrequestreview-5722170413)
on `d59c560`; merged into `lab4-staging` on 2026-10-31. The re-review confirms
all previous focus, duplicate-submit, recovery, validation, reload, counter/style,
and PR-documentation items were addressed. It cites the author's 161 client /
296 server tests, build and E2E-01 results; the reviewer explicitly did **not**
rerun server or E2E verification at this head. The earlier client/build run was on
the previous head.

### feature/26-ticket-workflow #61

[@fahsai-02's review, 2026-10-31](https://github.com/thrxpt/toktickit/pull/61#pullrequestreview-5723714879)
on `698fbdd` requested changes after independently passing all 485 unit/API/UI/style
tests. The reviewer did not verify Chromium because the disposable database
configuration was undocumented.

| Item | Fact-check and response |
| --- | --- |
| 1 — Administrator ownership | **VALID.** The owner API accepted Administrators but the assignee list excluded them. The API contract and endpoint now list active IT Staff and Administrators, matching BR-20/ADR-0010. API and Chromium prove Staff assignment to Administrator and Administrator takeover of an already-owned Ticket. Inactive users and Requesters remain excluded. |
| 2 — UNIT-02 traceability | **VALID.** Restored the original planned file `server/tests/lab-04/status-matrix.unit.test.ts`, named for Lab 4 AC-09/BR-15/BR-16, and restored its test-plan path. Lab 3 tests remain regression coverage. |
| 3 — Cancelled owner/priority | **CONTRACT-CONFORMING.** BR-15 makes status terminal; it does not freeze other Ticket-owned fields. UI contract now states that owner and IT Priority remain version-guarded and editable by operational roles. No new server restriction added. |
| 4 — E2E configuration | **VALID.** `tests.md` §6 and README document sourcing/exporting `.env.test` in a subshell, initializing its database with the server harness, and `CI=1` to prevent reusing a development server. |
| 5 — Silent status guard | **VALID hardening.** An unavailable submission now displays recovery text and sends no write; the rendered UI regression first failed for the silent return. Existing conflict/reload feedback remains. |
| 6 — Issue closure | **VALID.** PR description uses `Refs #53` because the target is `lab4-staging`, not the default branch. |
| 7 — Human E2E verification | **VERIFICATION LIMITATION.** The documented command was rerun successfully against newly created `toktickit_review_test`, distinct from `server/.env`, applying all migrations before both Chromium journeys and teardown. Human re-verification was pending at that follow-up; the later approval below independently confirms it. |

The original follow-up recorded author verification, not a posted GitHub reply,
approval, or reviewer Chromium run at that point. The review's
minor observations about version-check precedence and existing feedback timers did
not identify a new contract defect and remain unchanged.

**Latest reviewer verdict:** [Approved by @fahsai-02, 2026-10-31](https://github.com/thrxpt/toktickit/pull/61#pullrequestreview-5724299806)
on `cbc9250`; merged into `lab4-staging` on 2026-10-31. Both blocking findings
were resolved. The reviewer independently ran 326 server and 169 client tests,
the eight UNIT-02 cases, and both Chromium E2E-02 journeys using the documented
disposable-database procedure, with clean setup/teardown. The reviewer did not
re-open the PR description to verify the reported `Refs #53` change; that limited
observation was explicitly non-blocking.

### feature/27-role-dashboards #60

[@fahsai-02's review, 2026-10-31](https://github.com/thrxpt/toktickit/pull/60#pullrequestreview-5721594425)
requested changes on `aca4cab`. Follow-up checked the merged head `f303ed7` on
2026-11-01 rather than assuming every finding still applied.

| Item | Fact-check and response |
| --- | --- |
| B1 — Default E2E scope | **VALID scope regression; retirement premise premature.** The default config discovered legacy Lab 2 suites along with Labs 3/4. The selector still exists on this head, and its retirement belongs to Issue 28, so the exact claimed failure was not assumed. Restored `testDir: ./e2e/lab-03`; the dedicated Lab 4 config still discovers all three Lab 4 files. The all-lab release run remains Issue 28 work. |
| B2 — Administrator attachments | **OUTDATED.** `698fbdd`, incorporated by merge `f303ed7`, permits Administrator attachment content under BR-20/ADR-0010. The authorization test passed in the merge verification. Extended E2E-03 now follows the dashboard link into Ticket Detail and completes a real browser download as Administrator. |
| B3 — Issue 25 conflicts | **OUTDATED.** Merge `f303ed7` resolved the conflicts, retained `playwright.lab4.config.ts`, and preserved both documentation histories. No history rewrite is needed. |
| C1 — Duplicate retry | **VALID usability issue.** The rendered assertion first failed for the page-level Try Again button. Removed that duplicate control while preserving the safe error summary and contract-required per-card Retry controls (ui-spec.md §2). Retry still reaches the endpoint; forbidden responses expose no retry. |
| C2 — Heading hierarchy | **VALID accessibility issue.** The rendered assertion reproduced `h3` captions directly after `h1`. Metric captions now use paragraphs with the same Bootstrap classes, matching the MetricCard caption contract and preserving section headings. |
| C3 — Requester labels | **INCORRECT as described.** The Requester dashboard has Open Tickets and Waiting for You cards, followed by Recently Updated and Recently Resolved lists. It has neither a separate Open status card nor a Resolved Tickets card. Kept the specified labels. |
| C4 — Concurrent metric consistency | **VALID limitation, non-blocking.** Default read-committed transactions do not provide a shared snapshot across statements. Documented that counts and lists can reflect different committed moments. The current contract requires authoritative backend calculations, not stronger isolation. |
| C5 — Administrator assignees | **OUTDATED.** `cbc9250`, incorporated by `f303ed7`, lists active IT Staff and Administrators and supports assignment/takeover. The current contract names both operational roles; no additional change needed. |
| S1 — Formatting | **SUBJECTIVE; adopted.** Wrapped the named route, navigation array, role-route expression and Zod refinement, and moved the dashboard import into the local import group. No behavior change. |
| E1 — Screenshot location | **VALID evidence gap.** E2E-03 now saves desktop/mobile screenshots under `artifacts/lab-04/screenshots/dashboards/`. Both are committed and were visually inspected at 1280/390 px. |
| E2 — Ticket Detail coverage | **VALID coverage gap.** E2E-03 creates a Ticket and attachment as Requester, follows its recent-list link as Administrator, and verifies a completed download with the expected filename. |

Verification: 23 focused client tests passed; `pnpm build` passed root typechecking
and both package builds; isolated headless Chromium E2E-03 passed. Discovery checks
confirmed the default Lab 3 and dedicated Lab 4 scopes. The UI detector and
`git diff --check` reported no findings. The full legacy E2E matrix was not rerun.

Proposed reply (not posted):

> Addressed the remaining E2E scope, retry, heading, formatting and evidence items.
> B2/B3/C5 were already resolved by the staging merge. The new Chromium journey
> follows an Administrator dashboard Ticket link and successfully downloads its
> attachment. Focused client tests, the production build/typecheck and E2E-03 pass;
> screenshots are committed. C3 does not match the Requester layout, and C4 is
> documented as a non-blocking read-committed consistency limitation. The default
> E2E command retains Lab 3 scope; the full release regression remains Issue 28.

That follow-up record and draft did not constitute a GitHub reply or a new
reviewer verdict.
At that snapshot, the human Changes Requested verdict still awaited re-review;
the later approval below is the current verdict.

### feature/27-role-dashboards #60 — re-review on `abe67f7`

[@fahsai-02's re-review, 2026-11-01](https://github.com/thrxpt/toktickit/pull/60#pullrequestreview-5727527291)
confirmed the earlier findings resolved or rebutted and requested changes on R1.

| Item | Fact-check and response |
| --- | --- |
| R1 — Lab 4 post-login waits | **VALID.** Reproduced E2E-01 timing out on `/tickets` after navigation to `/dashboard`. Updated all eight outdated Requester/Staff/Administrator waits in E2E-01 and both E2E-02 journeys to assert the FR-16 landing destination. The entire Lab 4 suite now passes, with existing behavioral assertions preserved. |
| R2 — Development Requester retirement | **WITHDRAWN by reviewer.** `tests.md` §5 retains the complete retirement inventory for Issue 28. No retirement changes belong to this follow-up. |
| N1 — Account label casing | **SUBJECTIVE / OPTIONAL NIT; adopted.** Account cards now show Requester, IT Staff, and Administrator, matching the existing loading captions. UI-12 checks all three labels and role URLs; the new assertion first failed against the uppercase captions. Updated E2E-03 and regenerated/inspected both dashboard screenshots. |
| N2 — Dashboard fixture cleanup | **INCORRECT as a persistent-residue claim.** The existing setup/teardown hooks run `cleanup-e2e.ts`, whose `E2E ` prefix matches this fixture and deletes child rows before Tickets. Full-suite teardown deleted five Tickets and one Attachment; direct post-run queries confirmed zero E2E Tickets and zero Attachment rows. Screenshots capture the fixture before teardown. No additional cleanup is needed. |

Verification: all four headless Chromium Lab 4 tests, ten focused dashboard client
tests, eight UNIT-02 setup-probe cases, and `pnpm build` (root typecheck plus both
packages) passed on the isolated `toktickit_test` database. Legacy E2E suites were
not rerun. The earlier E2E-03-only verification missed R1; this full Lab 4 run
closes that verification gap without claiming the all-lab release regression.

Proposed reply (not posted):

> R1 was valid: updated all eight outdated post-login waits to assert `/dashboard`.
> All four Lab 4 Chromium tests now pass, along with ten dashboard client tests
> and the production build/typecheck. Adopted N1's account-label casing and updated
> screenshots. N2 is already covered by global teardown: the full run deleted all
> five fixture Tickets and the attachment, with zero E2E Tickets/Attachments left.
> The Issue 28 retirement inventory remains intact.

That follow-up was agent verification, not a posted reply or human approval;
the Changes Requested verdict still required re-review at that point. The human
approval below supersedes it.

**Latest reviewer verdict:** [Approved by @fahsai-02, 2026-11-01](https://github.com/thrxpt/toktickit/pull/60#pullrequestreview-5727849545)
on `978a959`; merged into `lab4-staging` on 2026-11-01. The reviewer confirms
R1, N1 and N2 resolved and no new blocking issues. Independent verification:
179 client tests, the production build, and all four Lab 4 Chromium cases passed.
The reviewer did not run server tests or legacy Lab 2/3 E2E in that round. The
recorded development-credential failure was local; verification passed against
`toktickit_test` with the documented override.

### feat/final-release #62

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/62>

**Scope:** Issue 28 / #55 — retire legacy identity (BR-30), harden duplicate/retry
handling and draft recovery (FR-19, FR-20, BR-33), verify regression and responsive
accessibility, capture visual evidence, and update setup/demo/release records.

**Initial reviewer verdict:** [COMMENTED by @fahsai-02, 2026-11-01](https://github.com/thrxpt/toktickit/pull/62#pullrequestreview-5728702889)
on `1a53155`, requesting the first four findings before merge. The earlier automated
Standards/Spec checks missed defects found by this human review. The approval below
supersedes this initial verdict.

| Inline comment | Fact-check and response |
| --- | --- |
| [1 — Logout](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125014) | **VALID for expired sessions.** Logout `401` now clears local identity and reaches Sign In. Network/5xx failures retain state and safe retry feedback because neither confirms clearance of the HttpOnly cookie. |
| [2 — Server error copy](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125017) | **VALID.** Staff mutations, Public Comments, Internal Notes, and Change Password display messages from validated API error envelopes. Network/parser errors keep fixed recovery copy; drafts and choices survive rejection. Arbitrary exception messages are not exposed. |
| [3 — Replay ordering](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125018) | **VALID for Tickets; INCORRECT for discussion.** Committed Ticket lookup precedes mutable active-reference checks; new Tickets still require active references. Comment/note routes have no status gate; HTTP reproduction confirmed both replays after cancellation already succeed. Authentication, authorization, ownership, and syntactic validation still run. |
| [4 — Attachment cleanup](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125020) | **VALID post-commit data-loss defect.** Cleanup preserves committed/referenced bytes, including uncertain commit acknowledgement; an unavailable database leaves an inert orphan rather than risking live evidence (ADR-0004). HTTP fault injection proves post-commit response failure remains downloadable, while a real insert rollback cleans up bytes. The deletion helper already swallows its own errors. |
| [5 — Removed-file replay](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125022) | **CONFLICTS_WITH_SPEC.** API §7 requires `404 ATTACHMENT_NOT_FOUND` for the old removed submission and forbids resurrection. Kept that behavior; a later intentional upload now gets a new client key (item 7). |
| [6 — Full-Ticket uploads](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125024) | **VALID unnecessary I/O/locking; no quota bypass.** Known-full fresh submissions stop before disk writes and row locks; active replays succeed. Bounded parsing/fingerprinting remains necessary because BR-33 includes file bytes, so a raw UUID alone cannot identify a replay. The locked count still enforces the atomic limit. |
| [7 — File-key lifecycle](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125030) | **VALID.** Both upload entry points clear the File's cached key after acknowledged success. Failed attempts retain the key; a later intentional upload uses a new key. |
| [8 — Changed payload](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125033) | **CONFLICTS_WITH_SPEC.** BR-33 defines changed normalized payloads as distinct submissions, even with the same UUID. Kept the scoped digest and existing HTTP proof; no raw-key mismatch rejection added. |
| [9 — Outcome identity](https://github.com/thrxpt/toktickit/pull/62#discussion_r4436125035) | **VALID duplicate React keys; index failure not reproduced.** Outcome rows carry stable submission IDs and their File, and retry resolves by ID. Same-named Files remain distinct. Ticket keys clear after acknowledged creation. The earlier immutable outcome list did not misroute an index retry. |

**Optional nits adopted:** grouped/consolidated imports, moved the cleanup import
below the module header, and placed Prisma `submissionKey` fields after `@id`.
Schema changes in this follow-up are formatting only; no migration is needed.

**Verification:** six rendered UI regressions and four HTTP regressions failed
before the fixes; the focused suites now pass. [release.md](release.md) records
the full command results. The fixed review base remains `1ae9137`.

**Draft reply (not posted):**

> Fixed the confirmed logout, API-message, Ticket-replay, attachment-cleanup,
> File-key, and same-name outcome defects. Full-limit fresh uploads now avoid disk
> writes and row locks. BR-33 still makes changed payloads distinct submissions,
> and API §7 keeps removed Attachment replays at 404. Comment/note replay after
> cancellation already succeeds. Regression tests cover the corrected cases;
> release.md records final verification. Please re-review the follow-up before merge.

The draft above was not posted as a GitHub reply. The subsequent submitted human
approval is recorded below.

**Latest reviewer verdict:** [Approved by @fahsai-02, 2026-11-01](https://github.com/thrxpt/toktickit/pull/62#pullrequestreview-5728819835)
on `59c15da7d5aa201d396adf260adeb80fc4e6474f`. The reviewer checked out the branch,
ran `pnpm test` (**337 server + 189 client passing**) and `pnpm build`, and confirmed
the submission-key migration applies cleanly. Their review confirms session-only
identity (BR-30), database-arbitrated retry handling (FR-19/BR-33), Ticket locking
for the five-Attachment limit (BR-35), and additive migration/record-preserving
submission-key reversal. Prisma column alignment remains a non-blocking nit.
The reviewer did not claim a new E2E run and explicitly required post-merge
staging verification for AC-22 / REG-01.

**Merge:** PR #62 merged into `lab4-staging` on **2026-11-01 at 15:29:50 UTC**,
producing `e26f6bd10decf31ba7494da217ddd9828ed2b5dd`. This completes the feature
peer-review gate; the staging-to-main release requires its own peer verdict.

---

## Lab 4 release PR — #63

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/63>

**Direction:** `lab4-staging` → `main`. References Issue 28 /
[#55](https://github.com/thrxpt/toktickit/issues/55). Parent
[#48](https://github.com/thrxpt/toktickit/issues/48) closed automatically when this
release merged.

**Latest peer verdict:** [Approved by @fahsai-02, 2026-11-01](https://github.com/thrxpt/toktickit/pull/63#pullrequestreview-5728892082)
on `e26f6bd10decf31ba7494da217ddd9828ed2b5dd` at **15:49:41 UTC**. This is a
separate approval of the release PR, in addition to the earlier #62 approval.
The submitted review does not claim an additional test run.

**Merge:** PR #63 merged into `main` on **2026-11-01 at 15:49:53 UTC**, producing
`8ff194ccc3b686b30d64e29aada292a7c9c3b07b`. Parent #48 closed at 15:49:55 UTC.

**Post-merge staging verification (2026-11-01):** tested
`e26f6bd10decf31ba7494da217ddd9828ed2b5dd` after #62 merged. `pnpm test` passed
**337 server + 189 client = 526 tests**, zero skipped. `CI=1 pnpm test:e2e` passed
**29 Chromium cases**, zero skipped, across Labs 2–4 (38.6 s). `pnpm build` passed
root E2E typechecking and both package builds. Node 24.18.0 / pnpm 11.20.0 with
`NODE_OPTIONS=--no-experimental-webstorage`; API and browser runs used the fresh,
isolated `toktickit_release_pr_test` sequentially. The harness applied all seven
migrations and seeded it; browser teardown restored the demo baseline. This is
agent execution evidence for AC-22 / REG-01, separate from human peer review.

**Released-head verification (2026-11-01):** checked out the actual `main` merge
`8ff194c` and reran the full commands: **526 unit/API/UI/style tests** and
**29 Chromium E2E cases** passed, zero skipped; `pnpm build` passed. The committed
tree also matches the verified staging tree exactly. This is agent execution
evidence, not a test claim attributed to the peer reviewer. See
[release.md](release.md) for runtime, database isolation and recovery details.

### Documentation follow-up — #64

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/64>

**Direction:** `docs/lab4-release-review-record` → `lab4-staging`; linked to
Issue 28 / [#55](https://github.com/thrxpt/toktickit/issues/55).

**Peer verdict:** Pending. PR #63 merged before this documentation PR. The original
application release is approved, merged and verified; its review records still
need to reach `main`. After #64 receives peer approval and merges into staging,
a separate documentation-only `lab4-staging` → `main` PR will carry these records.
Neither integration branch is advanced directly, and no approval of this follow-up
is implied by the earlier release approval.

---

## Pull Requests I reviewed for my partner

| Partner Issue | PR | Branch | My latest verdict | PR state |
| --- | --- | --- | --- | --- |
| 24 ([#77](https://github.com/fahsai-02/toktickit/issues/77)) | [#84](https://github.com/fahsai-02/toktickit/pull/84) | feature/24-sprint4-engineering-contract | [Approved, 2026-10-08](https://github.com/fahsai-02/toktickit/pull/84#pullrequestreview-5454321885) | Merged 2026-10-08 |
| 25 ([#78](https://github.com/fahsai-02/toktickit/issues/78)) | [#85](https://github.com/fahsai-02/toktickit/pull/85) | feature/25-actions-taken-foundation | [Approved, 2026-10-12](https://github.com/fahsai-02/toktickit/pull/85#pullrequestreview-5493210087) | Merged 2026-10-12 |
| 26 ([#79](https://github.com/fahsai-02/toktickit/issues/79)) | [#86](https://github.com/fahsai-02/toktickit/pull/86) | feature/26-actions-taken-ui | [Approved, 2026-10-28](https://github.com/fahsai-02/toktickit/pull/86#pullrequestreview-5686676601) | Merged 2026-10-28 |
| 27 ([#80](https://github.com/fahsai-02/toktickit/issues/80)) | [#87](https://github.com/fahsai-02/toktickit/pull/87) | feature/27-ticket-workflow-resolution-gate | [Approved, 2026-10-30](https://github.com/fahsai-02/toktickit/pull/87#pullrequestreview-5710614383) | Merged 2026-10-30 |
| 28 ([#81](https://github.com/fahsai-02/toktickit/issues/81)) | [#88](https://github.com/fahsai-02/toktickit/pull/88) | feature/28-role-dashboards | [Approved, 2026-10-31](https://github.com/fahsai-02/toktickit/pull/88#pullrequestreview-5723479993) | Merged 2026-10-31 |
| 29 ([#82](https://github.com/fahsai-02/toktickit/issues/82)) | [#89](https://github.com/fahsai-02/toktickit/pull/89) | feature/29-comprehensive-testing | [Approved, 2026-11-01](https://github.com/fahsai-02/toktickit/pull/89#pullrequestreview-5727857545) | Merged 2026-11-01 |

Source: submitted reviews by **@thrxpt** on **@fahsai-02's** Lab 4 PRs in
[`fahsai-02/toktickit`](https://github.com/fahsai-02/toktickit), checked on
**2026-11-01**. Ordered by the partner repository's Issue 24–29 (GitHub #77–#82),
whose numbering differs from this repository. Merge dates are UTC.

The summaries below record the reviews already posted, including corrections and
verification limits. They are not new reviews or fresh test runs. Requirement
IDs, fields, metrics, and contract exceptions in this section refer to the
**partner's contract**, not this repository's Lab 4 contract.

### Partner Issue 24 — Sprint 4 engineering contract, PR #84

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/84>

**My initial review:** [Changes requested, 2026-10-06](https://github.com/fahsai-02/toktickit/pull/84#pullrequestreview-5424674385)
on `ad1227f`. I requested four corrections: calculate the urgent Ticket aggregate
independently of the ten-row preview; explain the handout test-ID remapping;
justify the operational status-card selection; and document why merged Lab 3
material appeared in the Lab 4 contract PR.

**Partner follow-up / my final verdict:** [Approved, 2026-10-08](https://github.com/fahsai-02/toktickit/pull/84#pullrequestreview-5454321885)
on `6f23f5c`. My approval confirms an authoritative urgent count and matching
API-34 plan, the explicit test-ID note, AD-21 for status metrics, and AD-22 for
scope traceability. The PR merged into `lab4-staging` on 2026-10-08.

### Partner Issue 25 — Actions Taken foundation, PR #85

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/85>

**My review and verdict:** [Approved, 2026-10-12](https://github.com/fahsai-02/toktickit/pull/85#pullrequestreview-5493210087)
on `89d4fee`, with zero blocking defects or contract deviations. The review covers
the additive ActionTaken migration, session-derived attribution, authorization,
versioned action updates, seed sequence alignment, and isolated rollback testing.

The submitted verification record lists Prisma validation, server build and
16 unit tests, plus 201 client tests and the client build. Non-blocking nits
concerned naming the five-minute future allowance, simplifying a redundant version
ternary, and grouping route validation helpers. No separate change request or
follow-up approval was required. Merged on 2026-10-12.

### Partner Issue 26 — Actions Taken UI, PR #86

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/86>

**My initial review:** [Changes requested, 2026-10-22](https://github.com/fahsai-02/toktickit/pull/86#pullrequestreview-5612346243)
on `52b679e`. Findings covered unlayered Actions Taken CSS, the omitted read-only
Performed By field, `403` responses masked as empty lists, and inconsistent
Requester Notes column styling. Non-blocking observations included duplicated
presentation logic, form-state grouping, tablet layout, and an unrequested
character-counter warning state.

**Partner follow-up / my final verdict:** [Approved, 2026-10-28](https://github.com/fahsai-02/toktickit/pull/86#pullrequestreview-5686676601)
on `2aadcf0`, after reviewing `4663a5c` and `2aadcf0`. Styles moved into the
required CSS layer; forbidden responses gained visible errors and regression
coverage; shared `ActionList` presentation removed duplication and kept formatting
consistent. I accepted the documented rationale for omitting the drawer performer
field rather than claiming that a field had been added. The list-layout amendment
was recorded in the partner's contract.

The approval references 229 client tests and client-build commands. Permission-error
Retry and older test-reference wording remained non-blocking nits. Merged on
2026-10-28.

### Partner Issue 27 — Ticket workflow and resolution gate, PR #87

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/87>

**My review sequence:**

| Submitted review | Reviewed head | Findings / outcome |
| --- | --- | --- |
| [Changes requested, 2026-10-29](https://github.com/fahsai-02/toktickit/pull/87#pullrequestreview-5698837146) | `f9a5266` | Reject `version: null`; keep the client status helper's version optional as specified; clarify which writes increment Ticket.version. Also noted repeated conflict envelopes and missing UI traceability. |
| [Changes requested, 2026-10-29](https://github.com/fahsai-02/toktickit/pull/87#pullrequestreview-5705654843) | `b75075c` | Original items were addressed and 18 focused client tests passed. Found a remaining Refresh defect: the resolution-summary textbox retained old local text instead of the server's latest value. |
| [Approved, 2026-10-30](https://github.com/fahsai-02/toktickit/pull/87#pullrequestreview-5710614383) | `c429f74` | Follow-ups `f03e450` / `c429f74` synchronize the textbox, clear obsolete feedback, preserve failure feedback, and extend UI-30. No new standards/spec findings. |

The final review records 235 client tests across 20 files and a passing client
build. Server tests were not rerun in that final pass because those follow-up
commits did not change the backend. Merged on 2026-10-30.

### Partner Issue 28 — Role dashboards, PR #88

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/88>

**My review sequence:**

| Submitted review | Reviewed head | Findings / outcome |
| --- | --- | --- |
| [Changes requested, 2026-10-30](https://github.com/fahsai-02/toktickit/pull/88#pullrequestreview-5716145950) | `ad493a1` | Correct role landing pages, Recent Actions destinations, zero-activity Create Ticket links, and missing planned dashboard tests. Initially also flagged CSS-layer placement. |
| [Changes requested, 2026-10-31](https://github.com/fahsai-02/toktickit/pull/88#pullrequestreview-5721836507) | `381b8b5` | Confirmed those functional fixes and **withdrew my mistaken CSS-layer finding**. Requested loading skeletons/live announcements and tab-only URL changes that do not reload Ticket Detail. |
| [Changes requested, 2026-10-31](https://github.com/fahsai-02/toktickit/pull/88#pullrequestreview-5722041526) | `652988b` | Loading and tab synchronization were fixed; skeletons still omitted attention/Create Ticket, priority, and urgent-list sections. |
| [Changes requested, 2026-10-31](https://github.com/fahsai-02/toktickit/pull/88#pullrequestreview-5722337305) | `24a345a` | Three reserved list rows did not cover the API's five recent or ten urgent Tickets, leaving a layout shift. |
| [Approved, 2026-10-31](https://github.com/fahsai-02/toktickit/pull/88#pullrequestreview-5723479993) | `24499b5` | Five reserved rows plus a fixed-height scroll region for additional urgent rows resolved the layout finding; 264 client tests across 24 files passed. |

The final approval retained a non-blocking documentation nit: the UI contract's
approval paragraph still said nothing had been built/run despite recorded
implementation evidence. This record does not claim that nit was subsequently
fixed. Merged on 2026-10-31.

### Partner Issue 29 — Comprehensive testing, PR #89

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/89>

**My initial review:** [Changes requested, 2026-11-01](https://github.com/fahsai-02/toktickit/pull/89#pullrequestreview-5727188869)
on `eed11a0`. E2E-06 ignored all `4xx` console failures instead of only expected
URL/status pairs. REG-01 was also marked Pass while the evidence reported 209
passed / 73 skipped and all Lab 2 E2E files were skipped, contrary to the then-current
contract.

**Partner follow-up / my final verdict:** [Approved, 2026-11-01](https://github.com/fahsai-02/toktickit/pull/89#pullrequestreview-5727857545)
on `4b8d85b`. The filters were narrowed to known status/URL pairs, and the
**partner's v1.4 contract explicitly accepted the Lab 2 skip exception** in AC-17
and its Definition of Done. My approval accepted REG-01 under that amended
contract; it did not claim that the skipped cases were now passing. This exception
does not waive this repository's zero-skip release requirement.

The approval retained non-blocking documentation corrections: give the skip
exception an unused decision ID instead of reusing AD-21, put the v1.4 amendment
in the amendment table, and update the test plan's source version. No new test run
is asserted by that approval. Merged on 2026-11-01.

---

## Issue 28 automated implementation review — #55

User-confirmed fixed point: `1ae913790cda2af4a30b6734116333d5fd1e4db0`.
Reviewed implementation: `70d8891`, using
`git diff 1ae9137...70d8891`. Two independent, read-only agent reviews ran in
parallel through the code-review skill. No peer verdict for #55 is implied.

### Standards

Standards: 0 actionable findings; no material baseline smells.

The diff follows the locked stack and theme ownership, preserves server-side
authorization and version guards, adds reversible retry-key migrations, and
documents test/evidence changes. Legacy test updates retain their behavioral
assertions. Release gates remain explicitly pending.

Read-only review; no tests rerun by the reviewer.

### Spec

No actionable implementation findings against #55 and the amended Lab 4 contract.
Identity retirement, retry safety, draft recovery, additive migration, regression
coverage, README updates, and responsive evidence match the requested scope.

AC-22/REG-01 and the release criterion remain pending integration-branch
verification and peer-reviewed merges. `release.md` correctly records these as
outstanding gates without claiming completion.

Spec: 0 implementation findings; external release gates remain open.

Summary: Standards 0, Spec 0. Final local follow-up corrects a tooling-only test
option, enforces the shared mobile icon-button minimum width, strengthens its
rendered assertion, and refreshes screenshots/verification records. Those small
changes are self-verified with typechecking and the focused responsive suite.
