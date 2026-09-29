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
| 3 | `/implement #32 (Issue 16: authenticated app shell, role navigation, requester regression)` | Implemented `RequireRole` and `RequireAuth` routing, AppShell role badges, and authenticated Requester continuity. Peer review caught cross-role data leaks where undefined `requesterId` dropped Prisma WHERE clauses; prompted immediate implementation of strict `403 FORBIDDEN` role guards and ADR-0009. |
| 4 | `/implement #33 (Issue 17: IT Staff ticket queue)` | Delivered responsive ticket queue with multi-column sorting, debounced search, category/status/priority/owner filter drawer, and mobile card view. Resolved peer review findings on sorting accessibility (`aria-sort`, `tabIndex={0}`) and restored `GET /api/staff/assignees`. |
| 5 | `/implement #34 (Issue 18: IT Staff ticket detail, ownership, priority, status)` | Built operational ticket detail view, claim workflow (with BR-23 auto-advance `NEW` -> `OPEN`), IT Priority modification, and permitted status transitions. Peer reviewer identified B1 contradiction regarding Administrator access; successfully restricted queue/detail operations strictly to `IT_STAFF` across code and contract. |
| 6 | `/implement #35 (Issue 19: public comments, internal notes, requester resolution)` | Built two-tier discussions with append-only Public Comments and private Internal Notes with amber security callout styling. Added "Problem Appears Resolved" requester action. Implemented tie-breaking on comments/notes queries and full length validation with ARIA error linking. |
| 7 | `/implement #36 (Issue 20: administrator user management with safety rules)` | Implemented Admin User Management master-detail view with search, role filters, and responsive creation/edit drawer. Enforced four strict safety rules: no self-deactivation, no deactivation of sole active admin, no self-demotion, and duplicate email conflict rejection. Handled Prisma `P2002` TOCTOU race conditions. |
| 8 | `/implement #37 (Issue 21: Lab 3 E2E tests, visual evidence, release)` | Configured Playwright for Lab 3 with automatic database reseeding, authored 4 comprehensive test specs (`authentication.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`, `responsive.spec.ts`), systematically captured all 12 committed screenshots under `artifacts/lab-03/screenshots/`, and prepared release to main. |

## My Reflection

Sprint 3 presented a fundamentally different engineering challenge than previous sprints: **enforcing non-functional security invariants across distinct trust boundaries**. In earlier labs, features were largely additive within a single user context. In Lab 3, any ambiguity in role boundaries immediately created privilege escalations or data exposure vulnerabilities.

Working with LLMs in an adversarial security context highlighted both their immense utility and their most dangerous pitfalls:

### 1. The Fallacy of UI-Only Restrictions
Early in the sprint, AI code suggestions repeatedly fell back on hiding UI buttons or routing guards while leaving backend endpoints open to any authenticated caller. For example, in Issue 16, while the client shell hid the ticket creation form from staff, the Express router lacked an explicit `requireRole("REQUESTER")` guard. When tested with a staff session token, Prisma's `where: { requesterId: req.requesterId! }` evaluated `req.requesterId` as `undefined`, causing Prisma to silently omit the filter and return every customer's tickets to the staff caller!

Catching this required writing explicit adversarial tests (`authorization.api.test.ts`) that purposefully made cross-role HTTP requests. Once caught, we established the rule that every single controller must enforce role authorization independently of the frontend, treating all incoming request parameters with zero trust.

### 2. Contradiction Resolution and Contract Discipline
A recurring pattern was the AI's tendency to compromise across contradictory requirements rather than forcing a clean architectural decision. In Issue 18, when implementing IT Staff Ticket Detail, the specification table vaguely listed "IT Staff, Admin" on detail routes, whereas BR-14, api-spec.md §3, and ADR-0008 strictly stated that Administrators cannot claim tickets or browse the operational queue. The model initially resolved this by allowing Administrators into ticket detail with broken dropdowns and confusing claim buttons.

Through rigorous peer review with `@fahsai-02`, we forced a single authoritative stance: Administrators are restricted strictly to user management and audit discussions; all queue and ticket operational endpoints are gated exclusively to `IT_STAFF`. We updated the contract, the router guards, and the tests to align across all sources.

### 3. Asynchronous Concurrency and Database Race Conditions
When implementing user creation in Issue 20, the AI implemented a pre-check query (`findUnique({ where: { email } })`) to reject duplicates with 409 Conflict. Peer review correctly flagged this as a classic Time-of-Check to Time-of-Use (TOCTOU) vulnerability: concurrent requests arriving simultaneously could both pass the pre-check and crash the server with an unhandled 500 error. The solution was ensuring the database unique constraint (`email` UNIQUE) remained the ultimate source of truth, catching Prisma's `P2002` error code at runtime and mapping it cleanly into the standardized 409 error envelope.

### 4. End-to-End Verification as the Ultimate Source of Truth
The value of automated Playwright E2E tests running against a real PostgreSQL database was proven decisively in Issue 21. While unit and component tests verified forms in isolation, only end-to-end multi-role tests in headless Chromium proved that:
- Logging in with temporary credentials forces the user into the password change flow and successfully clears `mustChangePassword` upon completion.
- Claiming an unassigned ticket advances its status from `NEW` to `OPEN` and immediately synchronizes across both queue and detail views.
- Public comments are visible across Requester and Staff roles, while private internal notes remain strictly invisible to customers.
- Mobile viewports (390px) operate cleanly without horizontal scrollbars, and touch targets meet accessibility standards (≥ 44px).

In conclusion, combining Spec-Driven Development, peer code review, multi-layered automated testing (unit, API, UI, style, responsive, E2E), and disciplined AI interaction allowed us to ship a production-grade, highly secure, and verified IT service desk system.
