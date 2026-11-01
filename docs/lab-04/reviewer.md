# Lab 4 — Peer Review Record

**Author:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt
**Peer reviewer:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#56](https://github.com/thrxpt/toktickit/pull/56) | feature/22-lab4-contract | Approved and merged (latest GitHub state checked 2026-11-01) |
| [#59](https://github.com/thrxpt/toktickit/pull/59) | feature/25-actions-taken-ui | Approved and merged (latest GitHub state checked 2026-11-01) |
| [#61](https://github.com/thrxpt/toktickit/pull/61) | feature/26-ticket-workflow | Approved and merged (latest GitHub state checked 2026-11-01) |

Current GitHub state (2026-11-01) also confirms [#57](https://github.com/thrxpt/toktickit/pull/57),
[#58](https://github.com/thrxpt/toktickit/pull/58), and
[#60](https://github.com/thrxpt/toktickit/pull/60) are **APPROVED / MERGED** into
`lab4-staging`. Earlier change-request narratives below are historical records;
they do not override these later peer verdicts. Issues #49–#54 are closed.
Issue #55's implementation and release PRs still require human review and the
integration-branch verification described in [release.md](release.md).

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

> _Awaiting re-review and explicit approval. The 2026-10-29 review requested changes._

**Reviewer verdict:**

> Changes requested (`@fahsai-02`), 2026-10-29. Follow-up awaiting re-review.

---

## Pull Requests I reviewed for my partner

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| — | — | — |

---

_This record is extended as each Lab 4 Issue's PR is reviewed. A PR is recorded as
Approved only after the reviewer has posted that verdict; an open PR is never
self-certified._


### feature/25-actions-taken-ui #59

[@fahsai-02's review, 2026-10-31](https://github.com/thrxpt/toktickit/pull/59#pullrequestreview-5721594365)
on `16da3db` was submitted as `COMMENTED`, with two requested pre-merge fixes:
visible Follow-Up switch focus and explicit duplicate-submit coverage. Both were
verified and corrected. The update also addresses safe error copy, API validation
wording, failed-save focus, shared reload behavior, and the small presentation/test
nits. The lost-response retry limitation is documented. Rendered Chromium checks
exercise focus in both switch states, a double-click with one POST/action, and
failure recovery. Approval and merge remain pending; this record does not claim a
new reviewer verdict.

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
| 7 — Human E2E verification | **VERIFICATION LIMITATION.** The documented command was rerun successfully against newly created `toktickit_review_test`, distinct from `server/.env`, applying all migrations before both Chromium journeys and teardown. Human re-verification and a new review verdict remain pending. |

This record describes verified changes and their evidence. It is not a posted
GitHub reply, approval, or claim that the reviewer has rerun Chromium. The review's
minor observations about version-check precedence and existing feedback timers did
not identify a new contract defect and remain unchanged.

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

This record and draft do not constitute a GitHub reply or a new reviewer verdict.
The human Changes Requested verdict remains pending human re-review.

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

This record is agent verification, not a posted reply or human approval. The
Changes Requested verdict still requires human re-review.
