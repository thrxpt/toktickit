# Lab 2 Sprint Engineering Specification

Companion documents, which together form one contract: [`api-spec.md`](./api-spec.md),
[`ui-spec.md`](./ui-spec.md), [`tests.md`](./tests.md). Vocabulary is fixed by
[`CONTEXT.md`](../../CONTEXT.md) — **Ticket**, **Requester**, **Development Requester**,
**Category**, **Related System**, **Attachment**, and **Soft removal** mean what it says
they mean.

## 1. Sprint Goal

A Requester can raise a real IT support Ticket and live with it afterwards: describe the
problem, classify it, attach evidence, submit it, receive an official Ticket Number, then
find it again in My Tickets, open it, and manage its Attachments — seeing only their own
Tickets and nobody else's. Lab 2 also establishes the Zen Green visual system and the
reusable form, list, badge, state, and responsive conventions every later screen inherits.

## 2. Stakeholder Request Interpretation

The IT department wants the front door open. Lab 1 proved the stack conducts electricity;
Lab 2 puts something on it that a real person could use — a professional, responsive,
Requester-facing ticketing experience backed by a real database and a real API contract.

Authentication is the next sprint's work, so this sprint needs a stand-in for "who is
using the app." That stand-in is a Development Requester selector: a dropdown of seeded
Requesters that establishes the acting identity for testing. The critical reading is that
the selector is *a testing mechanism, not a login*. The ownership rules it feeds are not
provisional — they are enforced server-side and stay exactly as written when Lab 3
replaces the selector with authentication. What is temporary is only how the identity
arrives, never whether it is checked.

The instruction to "store the data safely" is read as three concrete obligations: the
backend owns every system-generated value, no Requester can reach another's data through
any route, and uploaded files are validated by content rather than by what the uploader
claims about them.

## 3. Scope

### Included

- Development Requester Selection screen, persisted selection, and Change Requester
- Create Ticket: reference data, validation, submission, success state with Ticket Number
- My Tickets: owned Tickets only, with search, filtering, sorting, and pagination
- Requester Ticket Detail: read-only Ticket information
- Attachment lifecycle: upload at creation, upload to an existing Ticket, metadata,
  download, and soft removal with a recorded reason
- Requester ownership enforcement on every Ticket and Attachment route
- Zen Green theme, the reusable component set, and the responsive rules in `ui-spec.md`
- Loading, empty, no-results, validation-failure, and API-failure states on every screen
- Unit, API, UI, UI-style, responsive, and E2E tests, traced to acceptance criteria

### Excluded

- **Authentication and security**: login, logout, passwords, hashing, sessions, tokens,
  and real role-based authorization. The Development Requester selector is not
  authentication and is not treated as such anywhere in this specification.
- **IT Staff workflow**: staff dashboard, queue, claiming, reassignment, IT Priority, and
  Ticket Owner. These appear in the handout's illustrations; Lab 2 stores and renders
  neither — see §11, Decision D-03.
- **Ticket collaboration**: Public Comments, Internal Notes, Actions Taken.
- **Ticket lifecycle after creation**: every status transition beyond the initial `NEW`,
  including resolving, closing, reopening, and cancelling. `Resolution Summary` is not
  modelled.
- **Administration**: management of users, Requesters, roles, and reference data.
- **Hard deletion** of anything. Removal is soft, always.

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | The Development Requester Selection screen lists every **active** Requester loaded from PostgreSQL, and no inactive one. |
| FR-02 | Selecting a Requester and confirming establishes the Development Requester context and persists it across page reloads. |
| FR-03 | The application shell displays the current Development Requester's name and offers a **Change Requester** action returning to the selection screen. |
| FR-04 | Any Ticket screen reached without a valid Development Requester context redirects to the selection screen. |
| FR-05 | Create Ticket captures Summary, Description, Category, Related System, and Requested Priority, and accepts optional Attachments. |
| FR-06 | The backend generates the Ticket Number, the Ticket Date, the initial Current Status, and the owning Requester; the client sends none of them. |
| FR-07 | A successful submission displays the generated Ticket Number, the per-file outcome of every Attachment, and a next action. |
| FR-08 | My Tickets lists the Development Requester's Tickets and only theirs, paginated, newest first. |
| FR-09 | My Tickets supports search over Ticket Number and Summary, filtering by Category, Requested Priority, and Current Status, and sorting by the fields named in BR-23. |
| FR-10 | Ticket Detail presents one owned Ticket's information as read-only. |
| FR-11 | Ticket Detail lists that Ticket's Attachments, distinguishing active from removed. |
| FR-12 | A Requester can add a permitted Attachment to an existing Ticket they own. |
| FR-13 | A Requester can download or preview an active Attachment on a Ticket they own. |
| FR-14 | A Requester can soft-remove an Attachment on a Ticket they own, supplying a reason. |
| FR-15 | Every screen renders distinct loading, empty, no-results, validation-failure, and API-failure states as specified in `ui-spec.md`. |
| FR-16 | Categories and Related Systems are loaded from PostgreSQL at use time; neither is hard-coded in the client. |

## 5. Business Rules

Rules BR-01 to BR-03 are fixed by the handout and reproduced verbatim.

### Identity and ownership

| ID | Rule |
|---|---|
| BR-01 | The official Ticket Number is generated by the backend and must be unique. |
| BR-02 | A new Ticket begins with Current Status New. |
| BR-03 | Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication. |
| BR-04 | The Development Requester is transmitted to the API in the `X-Requester-Id` request header. A `requesterId` appearing in a request body is rejected, never honoured (ADR-0003). |
| BR-05 | Only active Requesters appear in the selector and may be used as context. A request whose header names an unknown or inactive Requester is rejected with 400. |
| BR-06 | A Ticket belongs to the Development Requester that created it. Ownership is assigned server-side at creation and is immutable in Lab 2. |
| BR-07 | A Requester may read, list, and modify only their own Tickets and the Attachments of those Tickets. |
| BR-08 | An ownership failure is answered identically to a missing resource — 404, same body — so that resource existence cannot be probed (ADR-0005). |
| BR-09 | Changing the Development Requester discards all previously loaded requester-specific data; no Ticket from the previous Requester may remain visible in any view. |
| BR-10 | In Lab 3, `X-Requester-Id` is replaced by an authenticated identity resolved from a token. Ownership rules, queries, and schema do not change; only the resolution step does. |

### Ticket data and defaults

| ID | Rule |
|---|---|
| BR-11 | The Ticket Number is formatted `TKT-<four-digit year>-<six-digit zero-padded counter>`, e.g. `TKT-2026-000042`. |
| BR-12 | The counter is drawn from a dedicated PostgreSQL sequence inside the creation transaction, and `ticketNumber` carries a unique constraint as a backstop. |
| BR-13 | Ticket Date is the creation timestamp, system-generated, read-only, and never supplied by the client. |
| BR-14 | Requested Priority is one of `LOW`, `MEDIUM`, `HIGH`. It is required; the API applies no default. The UI preselects `MEDIUM`. |
| BR-15 | Current Status is one of the values in `TicketStatus`, which in Lab 2 contains only `NEW`. No transition is implemented. |
| BR-16 | Category is required and must reference an active Category. |
| BR-17 | Related System is required and must reference an active Related System. |
| BR-18 | Category and Related System are independent: neither constrains the other's options. |

### Validation

| ID | Rule |
|---|---|
| BR-19 | All string input is trimmed before validation and stored trimmed. A whitespace-only value fails its required check. |
| BR-20 | Summary is required, 5–150 characters after trimming. The upper bound keeps it readable as a single table column. |
| BR-21 | Description is required, 10–4000 characters after trimming. |
| BR-22 | Removal reason is required on soft removal, 1–200 characters after trimming. |
| BR-23 | Every rule in this section is enforced by the API. The client mirrors them for immediate feedback, but the server is authoritative and is never trusted to have been pre-checked. |
| BR-24 | Duplicate submission is prevented by disabling the Submit button and showing a busy state while a request is in flight. No server-side de-duplication exists — two genuinely similar Tickets are a legitimate scenario (Decision D-05). |
| BR-25 | After any failed submission, every value the Requester entered is retained in the form. Nothing is cleared on error. |

### Listing

| ID | Rule |
|---|---|
| BR-26 | Search matches a case-insensitive substring against Ticket Number **or** Summary. |
| BR-27 | Filters are Category, Requested Priority, and Current Status; each accepts a single value and combines with the others by AND. |
| BR-28 | Sortable fields are `createdAt`, `ticketNumber`, and `updatedAt`. The default is `createdAt` descending, with `id` descending as a stable secondary sort so that rows cannot repeat or vanish across page boundaries. |
| BR-29 | Pages are 1-based; `pageSize` defaults to 10 and must be 10, 20, or 50. A page beyond the last returns 200 with an empty collection, never 404. |
| BR-30 | An unrecognised, malformed, or out-of-range query parameter is rejected with 400 naming the offending parameter. Invalid values are never silently clamped or ignored. |
| BR-31 | An owned-but-empty list ("you have no Tickets") and an empty filtered result ("no Tickets match") are distinct states with distinct messages and distinct actions. |

### Attachments

| ID | Rule |
|---|---|
| BR-32 | Permitted types are JPG/JPEG, PNG, WEBP, and PDF. |
| BR-33 | Type is determined by inspecting the file's magic bytes. The client-declared MIME type and the filename extension must also agree with the allowlist, but neither is sufficient on its own. |
| BR-34 | Maximum file size is 5 MB per file. |
| BR-35 | A Ticket may hold at most five **active** Attachments. Removed Attachments do not count, so a removal frees a slot. |
| BR-36 | Stored metadata: original filename, MIME type, size in bytes, storage key, uploading Requester, upload timestamp, and the removal fields in BR-38. |
| BR-37 | Bytes are stored on the filesystem under a generated UUID storage key. The uploader's filename is stored as data and never used as, or joined into, a filesystem path (ADR-0004). |
| BR-38 | Soft removal records `removedAt`, `removedById`, and `removalReason`. An Attachment is active when `removedAt` is null. Nothing is ever hard-deleted. |
| BR-39 | A removed Attachment remains visible as metadata — filename, size, who removed it, when, and why — and cannot be downloaded or previewed. Its content route returns 404. |
| BR-40 | Only the Requester who owns the parent Ticket may upload to it, download from it, or remove its Attachments. |
| BR-41 | Ticket creation and Attachment upload are separate operations. A Ticket is created successfully even if every subsequent upload fails; each upload is individually atomic, leaving neither a row nor a file behind on failure (ADR-0006). |
| BR-42 | Removal requires an explicit confirmation step carrying the reason from BR-22. |

### System behaviour

| ID | Rule |
|---|---|
| BR-43 | Error responses never expose stack traces, SQL, Prisma errors, filesystem paths, or internal identifiers. |
| BR-44 | The seed is idempotent: repeated runs upsert on natural keys and never create duplicates. |
| BR-45 | Reference data is fetched from the API. No Category, Related System, Priority label, or Status label is hard-coded in the client. |

## 6. UI Specification Summary

Full detail in [`ui-spec.md`](./ui-spec.md). In summary:

- **Application shell** — Zen Green header carrying the TokTickIT identity, My Tickets and
  Create Ticket navigation with active-page indication, and a Profile menu showing the
  current Development Requester with a Change Requester action. A persistent notice states
  that the selection is a testing mechanism, not authentication.
- **Routes** — `/select-requester`, `/tickets`, `/tickets/new`, `/tickets/:id`, `/system`
  (the Lab 1 Check System page), and a not-found route. The three ticket routes are guarded
  by the Development Requester context.
- **Reusable components** — `AppShell`, `RequesterGuard`, `FormField`, `ReferenceSelect`,
  `Badge`, `Toolbar`, `Pagination`, `StateBlock`, `SubmitButton`, `AttachmentList`,
  `AttachmentUploader`, `ConfirmDialog`. Later Labs reuse these rather than inventing new
  ones.
- **States** — every data-bearing view renders loading, empty, no-results, and error
  variants through `StateBlock`; every form field renders its validation message beneath
  itself through `FormField`, never as a single anonymous banner.
- **Badges** — Requested Priority and Current Status always render text alongside colour,
  so nothing depends on colour alone.
- **Responsive** — desktop ≥992 px multi-column with a full table; tablet 768–991 px
  two-column with a reduced table; mobile <768 px stacked, with My Tickets rendering one
  card per Ticket. No horizontal page scrolling at any size.

## 7. Data Changes

New Prisma enums:

- `RequestedPriority` — `LOW`, `MEDIUM`, `HIGH`
- `TicketStatus` — `NEW` only. Later values are added in the Lab that implements them.

New models:

| Model | Fields |
|---|---|
| `Requester` | `id`, `name`, `email` (unique), `isActive` (default true), `createdAt`, `updatedAt` |
| `RelatedSystem` | `id`, `name` (unique), `isActive` (default true), `createdAt` |
| `Ticket` | `id`, `ticketNumber` (unique), `requesterId` → `Requester`, `categoryId` → `Category`, `relatedSystemId` → `RelatedSystem`, `summary`, `description`, `requestedPriority`, `status`, `createdAt`, `updatedAt` |
| `Attachment` | `id`, `ticketId` → `Ticket`, `originalFilename`, `mimeType`, `sizeBytes`, `storageKey` (unique), `uploadedById` → `Requester`, `createdAt`, `removedAt?`, `removedById?` → `Requester`, `removalReason?` |

Changed model:

- `Category` gains `isActive Boolean @default(true)`. Its existing shape is otherwise
  untouched, and `GET /api/categories` keeps returning `{ id, name }` so Lab 1's API-02
  continues to pass — the only change is a `where: { isActive: true }` filter.

Indexes and constraints, each with its justification:

| Object | Justification |
|---|---|
| `Ticket.ticketNumber` unique | BR-01; also the backstop for the sequence in BR-12 |
| `Ticket(requesterId, createdAt desc)` | Every My Tickets query filters by owner and sorts by creation date. This is the sprint's only hot path. |
| `Ticket.categoryId`, `Ticket.status`, `Ticket.requestedPriority` | Filter columns from BR-27 |
| `Attachment(ticketId, removedAt)` | The active-Attachment count in BR-35 and the active/removed split on Ticket Detail |
| `Attachment.storageKey` unique | One row per stored file; makes an orphaned or double-referenced file impossible |
| `Requester.email` unique | Seed idempotency (BR-44), and the natural login key Lab 3 will need |
| Sequence `ticket_number_seq` | BR-12 |

Migration decisions: one migration adds everything above, including the `isActive` column
on the existing `Category` table with a default so existing rows stay valid without a
backfill step.

## 8. API Contract

Full detail — request shapes, response shapes, every error case — in
[`api-spec.md`](./api-spec.md). Summary:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Unchanged from Lab 1 |
| GET | `/api/categories` | Active Categories |
| GET | `/api/related-systems` | Active Related Systems |
| GET | `/api/requesters` | Active Requesters, for the selector |
| POST | `/api/tickets` | Create one Ticket for the Development Requester |
| GET | `/api/tickets` | The Development Requester's Tickets, searched/filtered/sorted/paged |
| GET | `/api/tickets/:id` | One owned Ticket |
| GET | `/api/tickets/:ticketId/attachments` | Attachment metadata, active and removed |
| POST | `/api/tickets/:ticketId/attachments` | Upload one Attachment (multipart) |
| GET | `/api/attachments/:id/content` | Stream an active Attachment |
| POST | `/api/attachments/:id/removal` | Soft-remove, with reason |

Every failure, on every route, uses one envelope: `{ "error": { "code", "message", "fields"? } }`.
Status codes: 200 read and soft-removal, 201 create, 400 validation and requester-context
failures, 404 missing or not owned, 409 attachment limit reached, 413 file too large,
415 unsupported type, 500 unexpected.

## 9. Acceptance Criteria

### Development Requester context

- **AC-01** Given the database holds four active and one inactive Requester, when the selection screen loads, then exactly the four active ones are offered.
- **AC-02** Given no Development Requester is selected, when the user attempts to open My Tickets, then the Requester Selection screen is shown.
- **AC-03** Given a Requester is selected, when the page is reloaded, then the same Requester is still the context and no re-selection is required.
- **AC-04** Given a Requester is selected, when the user invokes Change Requester and picks another, then My Tickets shows the new Requester's Tickets and none of the previous Requester's.
- **AC-05** Given a persisted selection naming a now-inactive Requester, when the app loads, then the selection is discarded and the Requester Selection screen is shown.
- **AC-06** Given the requester API is unreachable, when the selection screen loads, then a safe error state with a retry action is shown and no dropdown of stale values appears.
- **AC-07** Given no active Requester exists at all, when the selection screen loads, then an empty state explaining that the seed must be run is shown, not an empty dropdown.

### Ticket creation

- **AC-08** Given valid Ticket data, when the Requester submits the form, then one Ticket is saved and the official Ticket Number is displayed.
- **AC-09** Given a Ticket has just been created, when its stored row is inspected, then `requesterId` equals the selected Development Requester and `status` is `NEW`.
- **AC-10** Given two Tickets created in succession, when their Ticket Numbers are compared, then both match `TKT-\d{4}-\d{6}` and differ.
- **AC-11** Given an empty Summary, when the Requester submits, then a field-level message appears beneath Summary and no API call is made.
- **AC-12** Given a Summary of only spaces, when the Requester submits, then it is treated as empty and rejected.
- **AC-13** Given a Summary of 151 characters, when it reaches the API, then the API responds 400 naming `summary`, independently of any client-side check.
- **AC-14** Given a request omitting Category or Related System, when it reaches the API, then the API responds 400 naming the missing field.
- **AC-15** Given a `categoryId` referencing an inactive Category, when the Ticket is submitted, then the API responds 400 and no Ticket is created.
- **AC-16** Given a submission is in flight, when the Requester clicks Submit again, then the button is disabled and busy and no second request is sent.
- **AC-17** Given the API is unreachable, when the Requester submits, then a safe error state is shown and every entered value remains in the form.
- **AC-18** Given a request body containing `requesterId`, when it reaches `POST /api/tickets`, then the body value is rejected and the header identity is used.

### My Tickets

- **AC-19** Given the Requester owns 14 Tickets, when My Tickets loads, then the first 10 are shown newest first with pagination reporting 14 total across 2 pages.
- **AC-20** Given Requester B is selected, when a Ticket belonging to Requester A is requested, then the Ticket data is not returned.
- **AC-21** Given a search term matching a Ticket Number, when the search is applied, then only matching Tickets are listed.
- **AC-22** Given a search term matching no Ticket, when the search is applied, then the no-results state is shown, distinct from the empty state and offering Clear Filters.
- **AC-23** Given a Requester with no Tickets at all, when My Tickets loads, then the empty state is shown, offering Create Ticket.
- **AC-24** Given a Category filter is applied, when the list renders, then every listed Ticket carries that Category.
- **AC-25** Given sorting by Ticket Number ascending, when the list renders, then the order matches and the applied sort is visibly indicated.
- **AC-26** Given `pageSize=7`, when the request reaches the API, then it responds 400 naming `pageSize`.
- **AC-27** Given a page number beyond the last, when the request is made, then the API responds 200 with an empty collection and the UI shows the no-results state.
- **AC-28** Given two Tickets share a creation timestamp, when both pages are fetched, then no Ticket appears on both pages and none is skipped.

### Ticket Detail and Attachments

- **AC-29** Given an owned Ticket, when its detail screen opens, then every Ticket field is displayed read-only and no editable control is present.
- **AC-30** Given a Ticket owned by another Requester, when its detail URL is opened directly, then a not-found state is shown and no Ticket data is present in the response.
- **AC-31** Given a valid 2 MB PNG, when it is uploaded to an owned Ticket, then it is stored and appears in the active Attachment list with its original filename.
- **AC-32** Given a 6 MB PDF, when it is uploaded, then the API responds 413, nothing is stored, and a field-level message explains the size limit.
- **AC-33** Given a file named `photo.png` whose bytes are not a PNG, when it is uploaded, then the API responds 415 and nothing is stored.
- **AC-34** Given a Ticket with five active Attachments, when a sixth is uploaded, then the API responds 409 and the UI explains the limit.
- **AC-35** Given an active Attachment, when it is downloaded, then the response carries its original filename and correct content type.
- **AC-36** Given an Attachment is soft-removed with a reason, when Ticket Detail reloads, then it appears in the removed group with the reason, remover, and timestamp, and offers no download control.
- **AC-37** Given a removed Attachment, when its content URL is requested directly, then the API responds 404.
- **AC-38** Given a removal is attempted without a reason, when it is submitted, then it is rejected and the Attachment stays active.
- **AC-39** Given a Ticket with five active Attachments where one is removed, when a new file is uploaded, then it succeeds — the removal freed a slot.
- **AC-40** Given an Attachment on another Requester's Ticket, when its content URL is requested, then the API responds 404.
- **AC-41** Given a Ticket is created and one of two Attachments fails to upload, then the Ticket exists with its Ticket Number displayed and the success screen names which file failed.

### Presentation

- **AC-42** Given any screen at 1440 px, 800 px, and 375 px, when it renders, then no horizontal page scrolling occurs and no label, message, or button is clipped or hidden.
- **AC-43** Given My Tickets at 375 px, when it renders, then Tickets appear as cards rather than a horizontally scrolling table.
- **AC-44** Given any Priority or Status badge, when it renders, then its meaning is carried by text and not by colour alone.
- **AC-45** Given a keyboard-only user, when they tab through Create Ticket, then every control is reachable with a visible focus indicator and the form is submittable without a mouse.
- **AC-46** Given any icon-only control, when it is inspected, then it exposes an accessible name.

## 10. Definition of Done

### Product completion

- [ ] Every FR implemented and every AC in §9 demonstrably satisfied against running code
- [ ] Every AC maps to at least one passing automated test in `tests.md`, with real file paths
- [ ] No required test skipped, disabled, commented out, or `.only`-scoped
- [ ] `pnpm test` passes from a clean checkout of `main` against a freshly migrated and seeded test database
- [ ] `pnpm test:e2e` passes against the running application
- [ ] The seed runs twice in a row without creating duplicates (BR-44)
- [ ] Every screen demonstrates loading, empty, no-results, validation-failure, and API-failure states
- [ ] Ownership verified from the API layer, not only by the UI hiding controls: AC-20, AC-30, AC-40 pass against direct API calls
- [ ] Attachment rules verified for type, size, count, magic bytes, soft removal, and blocked download of removed files
- [ ] Rendered screens match `ui-spec.md` at all three viewports, with committed screenshots as evidence
- [ ] No hard-coded reference data, Ticket Number, or Requester identity anywhere in the client
- [ ] No stack trace, SQL, Prisma error, or filesystem path reachable through any API response
- [ ] `README.md` setup, run, seed, and test instructions current and verified from a clean clone

### Course delivery

- [ ] Nine GitHub Issues, each on its own feature branch, all in **Done** on the Kanban board
- [ ] Every feature branch merged into `lab2-staging` through a peer-reviewed PR; one release PR from `lab2-staging` to `main`
- [ ] No commit made directly on `main` or `lab2-staging`
- [ ] `specification.md`, `tests.md`, `ui-spec.md`, and `api-spec.md` merged **before** the implementation PRs, with timestamp evidence
- [ ] `reviewer.md` records reviewer identity, PR links, comments given and received, responses, and approvals
- [ ] `ai-use.md` records the LLM used, 6–10 key prompts, and the reflection
- [ ] Submission PDF uses the headings **Answer Part 1** through **Answer Part 9** in order

## 11. Assumptions and Decisions

Only choices the handout left open. Each names its alternative and why it lost.

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Requester context travels in `X-Requester-Id`, not the request body | The handout's example JSON shows `requesterId` in a POST body; that shape spreads self-asserted identity across every route and is exactly what Lab 3 must unpick. See ADR-0003. |
| D-02 | The Prisma model is `Requester`, not the handout's illustrative `RequesterUser` | `RequesterUser` is transitional naming that becomes wrong the moment Lab 3 lands. `Requester` is the permanent domain role; `User` with a role field would be authentication scope creep. |
| D-03 | IT Priority, Ticket Owner, and Resolution Summary are neither stored nor rendered | They appear in the handout's illustrations but are explicitly excluded IT Staff scope (§4.2). Modelling them would add columns no test could exercise; seeding them would be fabricating data. The handout states its column list is not mandatory. |
| D-04 | Related System is independent of Category, and required | §5.1 requires no link between them, and the seeded systems do not partition cleanly — Email is arguably Software or Account and Access. A filtered dropdown would encode a false taxonomy. |
| D-05 | No server-side duplicate-submission rule | A "same Summary within N seconds → 409" rule blocks the legitimate case of a Requester filing two similar Tickets. The disabled busy Submit button (BR-24) addresses the actual failure mode, a double-click. |
| D-06 | Ownership failure returns 404, not 403 | 403 confirms existence, enabling enumeration against an unverified header identity. See ADR-0005. |
| D-07 | Tickets are addressed by numeric `id` in URLs; `ticketNumber` is display-only | The Ticket Number's format is a presentation decision that may change; the primary key is stable. |
| D-08 | Soft removal uses `POST /api/attachments/:id/removal`, not `DELETE` | The operation is a recorded removal, not a deletion, and DELETE request bodies (needed for the reason) are unreliable across clients. |
| D-09 | Removal reason is mandatory | The handout requires "removal-reason requirements"; an optional reason makes the audit trail worthless. |
| D-10 | Attachment bytes on the filesystem under generated UUID keys, validated by magic bytes | See ADR-0004. |
| D-11 | Two-phase upload with per-file compensation, not an atomic multipart create | See ADR-0006. |
| D-12 | Zen Green implemented as CSS custom properties overriding Bootstrap's variables | No SASS toolchain, tokens in one file quotable by `ui-spec.md`, and Bootstrap's component classes stay assertable by the style tests. |
| D-13 | The Lab 1 Check System page moves to `/system` rather than being deleted | The Definition of Done requires all tests passing from `main`; deleting a previous Lab's passing tests to achieve that is not the same thing. |
| D-14 | API tests run against a separate `toktickit_test` database | Lab 1's tests wrote to the development database, which was harmless when nothing created rows. Lab 2 creates Tickets, so shared state would make repeated runs unreliable and would corrupt the data being screenshotted. |
| D-15 | Issue numbering continues across Labs (5–13) and is independent of GitHub's issue/PR sequence | Lab 1 established branch number = Issue number with Issues 1–4. GitHub's sequence is shared with PRs and has drifted; following it would break the readable convention. |
| D-16 | New dependencies: `react-router-dom`, `multer`, `zod`, `@playwright/test` | Four screens require routing, Express 5 has no multipart parser, one validation library gives a single consistent 400 body across ten endpoints, and §8.8 requires Playwright screenshots. Approved as additions to the locked stack. |
