# Lab 4 release preparation — Issue 28 / GitHub #55

Implementation starts at `1ae913790cda2af4a30b6734116333d5fd1e4db0`, the merged
role-dashboard work on `lab4-staging`. Verification below is **feature-branch
evidence**. It does not claim a staging-to-main release or a peer verdict on #55.

## Delivered

- FR-22 / BR-30: session-only Requester identity across Ticket and Attachment
  operations; directory/selector/provider/header fallback removed. Legacy suites
  use actual login sessions and retain validation, ownership, and attachment checks.
- FR-19 / BR-33: persistent submission keys make unversioned creates retry-safe;
  unique indexes settle concurrent submissions. Versioned writes retain BR-12/BR-13.
  Attachment writes serialize on the Ticket so the active-file limit remains atomic.
- FR-20: synchronous in-flight guards protect forms before the next React render;
  account/discussion/Ticket drafts and failed Files survive recoverable failures.
  Both upload entry points offer same-key Retry. Failed Logout shows safe feedback
  and retains session state until the server acknowledges cookie clearance.
- AC-24/AC-25: shared visible input/button focus treatment, 44 px mobile targets,
  readable tablet work-log headings, server-driven transitions, and responsive
  evidence for major screens and action editor/conflict states.
- REG-01 preparation: the default Playwright command discovers all Lab 2–4 specs.
  API tests share one listener per file rather than churn ephemeral listeners.
  Every E2E Ticket fixture uses the cleanup prefix, cleanup removes its file bytes,
  and cleanup errors fail teardown. No retry setting or skipped assertion hides a
  failure.

The retry migration is additive: four nullable unique columns, no new package.
The cost is one small index/key per unversioned create. Keys are internal digests
scoped to the authenticated user, path, and normalized payload. They are not
permanent content deduplication: a new key or changed draft is a new submission.

## Automated verification (2026-11-01)

Runtime: Node 24.18.0, pnpm 11.20.0, PostgreSQL 17, headless Chromium. The host's
pnpm wrapper initially selected a different runtime; final verification explicitly
used the Node 24 Corepack shim. `NODE_OPTIONS=--no-experimental-webstorage` lets
jsdom own storage. No credentials were committed.

| Check | Result |
| --- | --- |
| `pnpm test` | 332 server + 181 client = **513 passing**, zero skipped |
| `pnpm test:e2e` | **29 passing**, zero skipped, across Labs 2–4 |
| `pnpm build` | Root E2E typecheck, server TypeScript build, client TypeScript/Vite build pass |
| Additive upgrade + reversal | API-23 preserves original Ticket, Comment, Internal Note, Attachment fields; keys initialize null |
| Clean-database README commands | All seven migrations, database probe, seed twice: 8 Tickets, 4 Actions Taken, 11 Users |
| UI mechanical detector | No findings on changed UI sources |
| `git diff --check` | Clean |

The full run uses a newly created `toktickit_release_final_test`, never the
existing development database. The README setup probe uses separate
`toktickit_readme_test`. API and browser runs execute sequentially on a given
database. API-29 proves concurrent and sequential replay, no duplicate bytes,
no internal-key exposure, session isolation, and a replay at the file limit.
E2E-04 commits upstream, deliberately loses the response, retries from the UI,
and checks one Ticket and one Attachment per File.

Initial combined runs exposed transient Supertest connection resets in different
legacy files. Focused rechecks passed; sharing a listener per file removes the
per-request lifecycle race without changing assertions or introducing retries.
The final passing run includes every old suite and the new migration/retry tests.
The database driver emits an existing `pg` query deprecation warning; it is not a
browser exception or a failing test.

## Visual and accessibility evidence

[`artifacts/lab-04/screenshots/release/`](../../artifacts/lab-04/screenshots/release/)
contains **57 PNGs**: each of these 19 screens/states at 1280, 768, and 390 px:

| Area | Capture names |
| --- | --- |
| Authentication | `login`, `change-password` |
| Requester | `requester-dashboard`, `requester-empty`, `my-tickets`, `create-ticket`, `requester-detail` |
| IT Staff | `staff-dashboard`, `ticket-queue`, `staff-detail`, `cancelled-detail` |
| Actions Taken | `actions-list`, `actions-create`, `actions-edit`, `actions-validation`, `conflict` |
| Administrator | `admin-dashboard`, `user-management`, `user-editor` |

Each capture focuses a real control using keyboard modality and asserts a visible
outline and no horizontal page overflow. Mobile control targets are checked, and
the shared theme sets 44 px targets for icon buttons, navigation, and switches.
The work-log list and editor, mobile conflict and preserved draft, role dashboards,
empty dashboard, and account drawer were visually inspected. Tablet inspection
caught mid-word table headings; condensed typography/padding now preserve them.
Drawer evidence captures its viewport, avoiding background content beyond a fixed
overlay in a full-document screenshot. Existing action/workflow screenshots are
regenerated by their journeys; Lab 2/3 committed historical images are retained.

Semantic labels, validation associations, counters, text-labelled badges, readonly
attribution, keyboard switch use, focus return, and role-restricted controls have
component/E2E assertions. Responsive journeys fail on application console errors,
unhandled page exceptions, and unexpected resource failures. Anonymous
`/api/auth/me` `401` probes and deliberate action `409` resource diagnostics are
expected by the API contract. This is Chromium and emulated-viewport evidence;
physical touch devices, other engines, and a manual screen-reader session were
not certified.

## Remaining release gates

GitHub checked on 2026-11-01: Issues #49–#54 are closed; PRs #56–#61 are approved
and merged into `lab4-staging`. The contract PR preceded implementation.

- [ ] Peer-review and merge this #55 feature work into `lab4-staging` through a PR.
- [ ] Run the complete commands above on the resulting staging head and record its
      SHA/results (AC-22 / REG-01); feature-branch evidence cannot satisfy that gate.
- [ ] Open, peer-review, and merge `lab4-staging` → `main` through a release PR.
- [ ] Verify the released head and move #55 to Done. No issue is closed early and
      no integration branch is advanced by a local commit or merge.

[reviewer.md](reviewer.md) keeps peer verdicts separate from automated review.
No approval or completed release is self-certified by this record.
