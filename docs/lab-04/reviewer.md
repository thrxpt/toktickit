# Lab 4 — Peer Review Record

**Author:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt
**Peer reviewer:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
| --- | --- | --- |
| [#56](https://github.com/thrxpt/toktickit/pull/56) | feature/22-lab4-contract | Changes requested; follow-up awaiting re-review |

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
