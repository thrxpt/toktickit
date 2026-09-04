# Lab 2 AI Use

**LLM used:** Claude 3.7 Sonnet, via Pi agent harness and Claude Code CLI

The specification agent's job in this sprint was to interrogate the handout rather than
paraphrase it: to find the decisions it deliberately left open, put each one to the student
with a recommendation and a rejected alternative, and only then write
`specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`. Every decision recorded in
§11 of the specification was approved by the student before any code was written.

## Key prompts

| # | Prompt | Outcome |
|---|---|---|
| 1 | Analyze the Lab 2 assignment requirements and illustrations, identify architectural decision points (identity handling, ownership error codes, file storage, and attachment atomicity), and draft the comprehensive specification, API spec, UI spec, and test plan before any code is written. | Produced `specification.md` (16 FRs, 45 BRs, 46 ACs), `api-spec.md`, `ui-spec.md`, `tests.md`, and ADRs 0003–0006 establishing the complete contract upfront. |
| 2 | Implement the Prisma schema for Requester, Ticket, RelatedSystem, and Attachment with postgres sequence `ticket_number_seq` and migration `20260827135731_lab2_data_model`. Implement an idempotent seed function (`seedReferenceData`) upserting on natural keys. | Generated migration, schema, seed data, and unit/API tests proving idempotent seeding (API-28 / BR-44) and database isolation with `toktickit_test`. |
| 3 | Build the Zen Green design system in `client/src/styles/theme.css` without stray hex values, along with the application shell, responsive navbar, and route table covering all planned screens. | Delivered `AppShell`, `theme.css`, route structure, and style tests checking accessible focus rings and read-only field rendering. |
| 4 | Implement the Development Requester selection screen (`/select-requester`), `RequesterContext` with `localStorage` persistence, `RequesterGuard` route protection, and Express middleware enforcing `X-Requester-Id` header across guarded routes. | Implemented client context and server middleware rejecting missing or inactive requester headers with 400 envelopes (BR-04, BR-05). |
| 5 | Implement the Create Ticket screen and `POST /api/tickets` endpoint with server-side sequence drawing for `TKT-YYYY-NNNNNN`, Zod input validation, duplicate submit prevention, and field-level error display. | Implemented creation transaction, sequence consumption, read-only field presentation, and success confirmation showing the generated Ticket Number (AC-08, BR-11, BR-24). |
| 6 | Implement the My Tickets screen (`/tickets`) with server-side search, multi-field filtering, column sorting with stable secondary sort (`id desc`), pagination, and responsive cards for mobile viewports. | Delivered `GET /api/tickets` and `MyTickets.tsx`, handling empty vs no-results distinction, aborting stale in-flight requests, and rendering card layout at `<768px`. |
| 7 | Implement read-only Ticket Detail view (`/tickets/:id`) with server-side ownership check returning 404 identical to a missing ticket (BR-08, ADR-0005) so resource existence cannot be probed. | Created `RequesterTicketDetail.tsx` and detail endpoint ensuring complete read-only field presentation and cross-requester access blocking (AC-29, AC-30). |
| 8 | Implement attachment lifecycle: two-phase upload with magic-byte validation, disk storage under UUID keys, download with Content-Disposition, and soft removal requiring a 1–200 character reason. | Implemented `AttachmentSection.tsx`, `attachments.ts` routes, stream downloads with `nosniff`, and soft removal with `ConfirmDialog` (AC-31 to AC-40). |
| 9 | Configure Playwright with Chromium, implement end-to-end tests for the complete requester journey, verify responsive layouts across 1440px, 800px, and 375px viewports, and capture all 25 evidence screenshots. | Created `playwright.config.ts`, `requester-ticket-flow.spec.ts`, `responsive.spec.ts`, and `evidence.spec.ts`, passing all 13 E2E/responsive tests and generating all 25 committed screenshots. |

## My Reflection

Working with an AI coding assistant across Lab 2 highlighted the critical value of contract-first development and disciplined scoping. AI tools excel at mechanical execution — scaffolding Zod validation schemas, generating Prisma migrations, creating TypeScript boilerplate, and writing repetitive unit tests. However, left to its own devices, an LLM defaults to common web application patterns that would have completely derailed this sprint:

- It repeatedly tempted us toward putting `requesterId` into POST bodies instead of the header seam (ADR-0003).
- It suggested returning 403 Forbidden for unowned tickets instead of 404 Not Found, which would have allowed attackers to probe ticket existence (ADR-0005).
- It initially tried to implement IT Staff workflows, Priority assignments, and Status transitions simply because they appeared in the handout's mockups, even though they were out of scope.

Having `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` merged before writing code acted as an immovable anchor. When the model attempted to improvise, we could cite rules like `BR-08` or `D-03` to keep it strictly within the vertical slice.

Equally important was the peer review cycle with `@fahsai-02`. Human reviewers caught subtle software engineering defects that the LLM generated and passed in its own tests:

- A race condition in `MyTickets.tsx` where fast filter changes could let an older in-flight request overwrite newer search results (fixed with `AbortController`).
- Accessibility oversights, such as missing focus traps and Escape key handlers on custom modal dialogs (`AttachmentSection.tsx`), and click-focusable read-only form fields.
- Content-Disposition header sanitization to strip semicolons, preventing header attribute injection during attachment downloads.

Overall, the combination of Spec-DD (Spec-Driven Development), strict automated test suites (76 tests across unit, API, UI, style, responsive, and E2E), peer review, and AI assistance allowed us to build a robust, clean, and fully verified IT service desk MVP.
