# Lab 3 AI Use

**LLM used:** Claude Sonnet 4.6 / Claude Opus 4.6 via Claude Code CLI and Pi agent harness, and Gemini 3.1 Pro / Gemini 3 Flash via Antigravity grounding

The third sprint marked TokTickIT's transition from a single-user prototype to an authenticated,
multi-role service desk spanning Requesters, IT Staff, and Administrators. Across this sprint,
AI assistance was applied under strict Test-Driven Development (TDD) and Specification-Driven
Development (Spec-DD) discipline. Every decision was verified against the contract, and no
code was accepted without automated regression and peer-reviewed proof.

## Key Prompts

| # | Prompt | Outcome |
| --- | --- | --- |
| 1 | `/grill-with-docs author sprint 3 engineering contract @docs/lab-03/` | Interrogated the Lab 3 requirements across RBAC partitioning, session lifecycle, password complexity, and administrative invariants. Formulated ADR-0006 through ADR-0008, established Given-When-Then criteria AC-01 through AC-21, and authored the 4 companion contract documents before implementation. |
| 2 | `/implement #31 (Issue 15: User model, password hashing, auth foundation)` | Built Prisma schema migration (`Requester` -> `User`), bcrypt hashing (work factor 10), JWT session cookies, mandatory password change middleware, and auth endpoints test-first (red-to-green with 29 new tests). Caught and fixed route whitelist pathname bypasses. |
| 3 | `peer review finding B1: seed data diverges from specification section 7 (named accounts) [PR #40 review]` | Evaluated trade-off between changing seed accounts versus reconciling specification. Recommended reconciling `specification.md section 7` (Option B) to match established Lab 2 baseline Requester accounts (4 active, 2 inactive), ensuring Lab 2 regression suite `API-26` passed without modification, while adding constant-time bcrypt dummy comparison (W4) and production JWT fail-closed checks (W2). |
| 4 | `/implement #32 (Issue 16: authenticated app shell, role navigation, requester regression)` | Implemented `RequireRole` and `RequireAuth` routing, AppShell role badges, and authenticated Requester continuity. Peer review caught cross-role data leaks where undefined `requesterId` dropped Prisma WHERE clauses; prompted immediate implementation of strict `403 FORBIDDEN` role guards and ADR-0009. |
| 5 | `/implement #33 (Issue 17: IT Staff ticket queue)` | Delivered responsive ticket queue with multi-column sorting, debounced search, category/status/priority/owner filter drawer, and mobile card view. Resolved peer review findings on sorting accessibility (`aria-sort`, `tabIndex={0}`) and restored `GET /api/staff/assignees`. |
| 6 | `/implement #34 (Issue 18: IT Staff ticket detail, ownership, priority, status)` | Built operational ticket detail view, claim workflow (with BR-23 auto-advance `NEW` -> `OPEN`), IT Priority modification, and permitted status transitions. Peer reviewer identified B1 contradiction regarding Administrator access; successfully restricted queue/detail operations strictly to `IT_STAFF` across code and contract, and added safe 32-bit integer bound check on ticket IDs. |
| 7 | `/implement #35 (Issue 19: public comments, internal notes, requester resolution)` | Built two-tier discussions with append-only Public Comments and private Internal Notes with amber security callout styling. Added "Problem Appears Resolved" requester action. Implemented deterministic secondary tie-breaking on comments/notes queries and full 2,000-character length validation with ARIA-linked error messages. |
| 8 | `review feedback on PR #45: handle TOCTOU race condition on duplicate email and drawer modal accessibility [Issue 20]` | Replaced application-level pre-check query (`findUnique`) with database-level unique constraint enforcement, catching Prisma `P2002` error at runtime and mapping it cleanly to 409 Conflict (`DUPLICATE_EMAIL`). Fixed tooltip precedence so `isSoleActiveAdmin` takes priority over `isSelf`, and added `aria-hidden`/`inert` to background drawer. |
| 9 | `peer review on partner's PR #73 (Comprehensive testing) [testing/code-review]` | Analyzed partner's E2E test runner; identified that cleanup at the end of the test body failed to run on assertion failures and that missing `workers: 1` in `playwright.config.ts` risked parallel DB collisions. Guided partner to move cleanup to `test.afterAll()` lifecycle hook with 180s timeout, enforce serial execution in config, and test AC-10/AC-11 with throwaway accounts. |
| 10 | `/implement #37 (Issue 21: Lab 3 E2E tests, visual evidence, release)` | Configured Playwright for Lab 3 with automatic database reseeding, authored 4 comprehensive test specs (`authentication.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`, `responsive.spec.ts`), systematically captured all 17 committed screenshots under `artifacts/lab-03/screenshots/`, added `STYLE-01` token test, and updated traceability tables with 100% passing tests (413 total). |

## My Reflection

Sprint 3 presented a fundamentally different engineering challenge than previous sprints: **enforcing non-functional security invariants across distinct trust boundaries**. In earlier labs, features were largely additive within a single user context. In Lab 3, any ambiguity in role boundaries immediately created privilege escalations or data exposure vulnerabilities.

Working with LLMs in an adversarial security context highlighted both their immense utility and their most dangerous pitfalls:

### 1. The Fallacy of UI-Only Restrictions
Early in the sprint, AI code suggestions repeatedly fell back on hiding UI buttons or routing guards while leaving backend endpoints open to any authenticated caller. For example, in Issue 16, while the client shell hid the ticket creation form from staff, the Express router lacked an explicit `requireRole("REQUESTER")` guard. When tested with a staff session token, Prisma's `where: { requesterId: req.requesterId! }` evaluated `req.requesterId` as `undefined`, causing Prisma to silently omit the filter and return every customer's tickets to the staff caller!

Catching this required writing explicit adversarial tests (`authorization.api.test.ts`) that purposefully made cross-role HTTP requests. Once caught, we established the rule that every single controller must enforce role authorization independently of the frontend, treating all incoming request parameters with zero trust.

### 2. Contradiction Resolution and Contract Discipline
A recurring pattern was the AI's tendency to compromise across contradictory requirements rather than forcing a clean architectural decision. In Issue 18, when implementing IT Staff Ticket Detail, the specification table vaguely listed "IT Staff, Admin" on detail routes, whereas BR-14, api-spec.md section 3, and ADR-0008 strictly stated that Administrators cannot claim tickets or browse the operational queue. The model initially resolved this by allowing Administrators into ticket detail with broken dropdowns and confusing claim buttons.

Through rigorous peer review with `@fahsai-02`, we forced a single authoritative stance: Administrators are restricted strictly to user management and audit discussions; all queue and ticket operational endpoints are gated exclusively to `IT_STAFF`. We updated the contract, the router guards, and the tests to align across all sources.

### 3. Asynchronous Concurrency and Database Race Conditions
When implementing user creation in Issue 20, the AI implemented a pre-check query (`findUnique({ where: { email } })`) to reject duplicates with 409 Conflict. Peer review correctly flagged this as a classic Time-of-Check to Time-of-Use (TOCTOU) vulnerability: concurrent requests arriving simultaneously could both pass the pre-check and crash the server with an unhandled 500 error.

The solution was ensuring the database unique constraint (`email` UNIQUE) remained the ultimate source of truth, catching Prisma's `P2002` error code at runtime and mapping it cleanly into the standardized 409 error envelope. This taught us that application-level validation must always defer to ACID relational guarantees for invariants involving concurrent writers.

### 4. Test Lifecycle and Database State Isolation
The value of automated Playwright E2E tests running against a real PostgreSQL database was proven decisively in Issue 21 and during peer review of PR #73. Testing complex multi-role workflows revealed critical subtleties in test fixture lifecycle management:
- Running database cleanup at the bottom of a test body is a serious anti-pattern; any assertion failure aborts test execution early, leaving orphaned records that poison subsequent tests. Moving cleanup into `test.afterAll()` guaranteed teardown regardless of test outcome.
- Database cleanups must respect relational foreign keys: deleting tickets concurrently with comments can fail with `P2003` foreign key violations. Teardown logic must delete child records (comments, notes, attachments) before deleting parent tickets.
- Using throwaway test accounts (e.g. `e2e.*@toktickit.dev`) rather than mutating seeded accounts preserves baseline database invariants, ensuring that subsequent regression runs do not fail due to dirty state.

### 5. Collaborative Peer Review as AI Grounding
The most effective safeguard against AI hallucinations and regressions was continuous, reciprocal peer review with `@fahsai-02`. Across 18 pull requests between our two forks, every major architectural assumption was challenged:
- Partner's reviews caught data leaks (Issue 16), seed discrepancies (Issue 15), queue role leakage (Issue 17), and accessibility regressions (Issues 17, 20).
- Our reviews on partner's PRs caught E2E cleanup vulnerabilities (PR #73), test timeouts from cost-factor 12 bcrypt hashing (PR #66), missing database disconnects (PR #70), and subtle layout stacking bugs across tablet breakpoints (PR #71).

The AI proved to be a powerful sparring partner when tasked with adversarial code review, identifying edge cases that neither developer spotted on first pass. However, human judgment was indispensable in evaluating trade-offs, enforcing contract consistency, and verifying that test passes represent genuine behavioral proof rather than tautological mocks.

### Conclusion
Ultimately, combining Spec-Driven Development (Spec-DD), strict test-first development (413 passing tests across unit, API, UI, style, responsive, and E2E), peer review, and disciplined AI execution allowed us to ship a reliable, fully verified IT service desk application that satisfies every single requirement of Lab 3.
