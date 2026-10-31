# Lab 4 — Peer Review Record

**Author:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt
**Peer reviewer:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#56](https://github.com/thrxpt/toktickit/pull/56) | feature/22-lab4-contract | Changes requested; follow-up awaiting re-review |
| [#59](https://github.com/thrxpt/toktickit/pull/59) | feature/25-actions-taken-ui | Commented: fix focus and duplicate-submit coverage before merge; follow-up awaiting re-review |
| [#61](https://github.com/thrxpt/toktickit/pull/61) | feature/26-ticket-workflow | Changes requested: assignment reachability and UNIT-02 evidence; follow-up awaiting re-review |

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
