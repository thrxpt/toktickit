# Lab 2 AI Use

**LLM used:** Claude Opus 5 and Claude 3.7 Sonnet, via Claude Code CLI and Pi agent harness

The specification agent's job in this sprint was to interrogate the handout rather than
paraphrase it: to find the decisions it deliberately left open, put each one to the student
with a recommendation and a rejected alternative, and only then write
`specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`. Every decision recorded in
§11 of the specification was approved by the student before any code was written.

## Key prompts

| # | Prompt | Outcome |
| --- | --- | --- |
| 1 | `/grill-with-docs read and understand the labsheet @.local/lab-02/Lab_02_labsheet.pdf` | Read all 22 pages of the handout, mapped open decisions into a design tree, and initiated 3 rounds of 27 targeted questions (each with a recommendation and the alternative it beat) before writing any specification. Prevented confident hallucinations of unstated business rules. |
| 2 | `all recommended` (Rounds 1 & 2 grilling responses) | Settled root architecture: rejected the handout's example JSON (`requesterId` in POST body) in favor of the `X-Requester-Id` header seam (ADR-0003), established 404-over-403 for ownership failure to avoid enumeration oracles (ADR-0005), and introduced an isolated `toktickit_test` database (D-14). |
| 3 | `confirmed, Q24 should start with feature 5 dont sync with # number` | Overrode the agent's recommendation to follow GitHub's shared issue/PR sequence. Kept branch number equal to Issue number (5–13) despite GitHub's counter having already drifted to #10 (recorded as decision D-15). |
| 4 | `/to-tickets implement lab 2` | Agent deferred to the committed contract table in `CLAUDE.md` rather than re-cutting competing slices. Surfaced three real cross-branch seam decisions (deferring AC-41 outcome reporting to Issue 12; body depth) and created GitHub issues with native blocking dependencies. |
| 5 | `/implement #12` (Issue 6: data model, migration, seed) | Built schema, migration, seed, and endpoints test-first (red-to-green). Ran unprompted `/code-review` whose spec sub-agent discovered that an exported `DATABASE_URL` could bypass the D-14 test database safety guard and that `ON DELETE SET NULL` contradicted the "no cascade deletes" comment. |
| 6 | `/implement #13` (Issue 7: app shell, routing, Zen Green theme) | Built `theme.css` with 12 tokens on `:root` and zero hex outside `theme.css`. Extracted `CheckSystem` verbatim to preserve Lab 1 UI tests (D-13), set up React Router with full route table, and implemented reusable components with red-to-green STYLE tests. |
| 7 | `this request changes are legal or not [PR #21 review]` -> `lets fix` | Evaluated peer review findings against contract: formalized helper component tests into `tests.md` rows `UI-22`..`UI-25` (updating planned count from 72 to 76), added explicit `:focus-visible` ring on header navigation for AC-45, and refined read-only `FormField` semantics. |
| 8 | `this request change comment is correct or not? [PR #23 review]` | Evaluated peer review on Create Ticket: disproved reviewer's claim that `RESTART IDENTITY` in truncate resets unowned sequence `ticket_number_seq`, while validating and fixing the contradictory retry wording on `TICKET_NUMBER_CONFLICT` (BR-43). |
| 9 | `/implement #18` followed by `/code-review` (Issue 12: attachments) | Implemented buffer magic-byte validation (JPEG, PNG, WEBP, PDF), UUID storage keys, and soft removal. Code review sub-agent caught that browser native `<a>` and `<img>` tags dropped `X-Requester-Id`, prompting refactor to `apiFetch` with object URLs and inline download retry. |
| 10 | `/implement #19` (Issue 13: E2E, visual evidence, release) | Configured Playwright with Chromium, implemented 10 E2E and responsive tests across 1440, 800, and 375 px viewports, captured all 25 committed screenshots matching `ui-spec.md` §9, verified seed idempotency (`BR-44`), and filled `tests.md` §6 with all 76 passing tests. |

## My Reflection

The single most valuable technique in this sprint was forcing the AI to ask questions before writing. When given an open assignment and told to "write the specification", an LLM produces something fluent, structurally complete, and quietly full of invented business rules that are invisible because they read with the exact same authority as real ones. Running three grilling rounds of 27 questions with explicit recommendations and alternatives turned those hidden assumptions into named, owned decisions recorded in `specification.md` §11.

The AI proved far more effective as an argumentative opponent than as an agreeable assistant. The decisions we have the highest confidence in are the ones where the agent argued against the handout's own examples and had to justify why:

- Recommending against the handout's illustrative JSON (`requesterId` in POST body) because spreading unverified identity across every request body would create an architectural mess for Lab 3 authentication (ADR-0003).
- Insisting on 404 Not Found rather than 403 Forbidden for ownership failures to prevent attackers from probing whether an unowned ticket exists (ADR-0005).
- Arguing against server-side duplicate-submission rules in favor of a busy, disabled Submit button (`BR-24`, D-05) to avoid blocking legitimate duplicate tickets.

However, the agent required decisive human course corrections whenever its drive for internal consistency detached from external reality. When planning branch names, it argued persuasively to sync branches with GitHub's issue numbers — a clean-sounding rule that failed immediately because GitHub's counter is shared with PRs and had already drifted (overridden by D-15).

Most crucially, the sprint revealed the characteristic failure mode of LLM coding agents: **the tell is never uncertainty in its prose**. The agent was equally confident, articulate, and unhedged whether its output was brilliant or completely broken. Across the sprint, three major self-contradictions occurred:

1. Writing an emphatic schema comment stating *"no cascade deletes anywhere... every relation is restrict-by-default"* directly above an emitted migration using `ON DELETE SET NULL` (which would have erased recorded removers).
2. Implementing a test-database safety module intended to protect development data from test truncations (D-14), but writing logic where an exported `DATABASE_URL` would silently bypass both `.env` files and point the test truncations directly at the development database.
3. Describing `ai-use.md` during tooling setup as already filled in with specific commit hashes when the file in fact contained only blank placeholders.

In every case, the error could not be detected from the wording of the explanation. It was caught only by cross-checking: running two-axis automated reviews (Standards vs Spec), checking database state in psql, running live regression tests, and conducting rigorous peer review with `@fahsai-02`.

Ultimately, combining Spec-Driven Development (Spec-DD), strict test-first development (76 passing tests across unit, API, UI, style, responsive, and E2E), peer review, and disciplined AI execution allowed us to ship a reliable, fully verified IT service desk application.
