# Lab 3 Test Plan and Traceability

Authoritative test plan planned from [`specification.md`](./specification.md) **before**
implementation, adhering to the Test-Driven Development (TDD) and Spec-DD methodology.
Every acceptance criterion maps to at least one planned automated test. Every planned test
specifies its exact file path and expected outcome.

---

## 1. Testing Strategy and Seams

TokTickIT verifies functionality across six architectural levels:

| Level | Identifier | Purpose | Technology |
| --- | --- | --- | --- |
| **Unit** | `UNIT-nn` | Pure logic validation: password complexity, status matrix, trimming bounds. | Vitest |
| **API** | `API-nn` | HTTP contract, session cookies, RBAC, ownership, and safe error envelopes. | Vitest + Supertest |
| **UI Component** | `UI-nn` | Screen states, interactive behavior, role rendering, form validation. | Vitest + Testing Library |
| **UI Style** | `STYLE-nn` | Zen Green tokens, class usage, badge styling, absence of inline hex. | Vitest + Testing Library |
| **Responsive** | `RESP-nn` | Desktop, tablet, and mobile (390px) layouts without clipping or overflow. | Playwright |
| **E2E** | `E2E-nn` | Full multi-role user journeys executed in headless Chromium. | Playwright |

### Database Isolation

API tests run against the dedicated test database `toktickit_test` configured in `server/.env.test`.
The Vitest `globalSetup` creates and migrates `toktickit_test` and executes the idempotent seed.
Each test file truncates operational tables (`InternalNote`, `Comment`, `Attachment`, `Ticket`)
in `beforeEach`, preserving seeded reference data and core user accounts (`User`, `Category`,
`RelatedSystem`).

### Security and RBAC Seam

Access control is tested at the HTTP layer, not just in UI component renders. Tests explicitly
attempt cross-role requests (e.g. Requester calling internal notes or user administration) to verify
that the server returns strict `401`, `403`, or `404` responses.

---

## 2. Planned Tests Table

### Unit Tests — `server/tests/lab-03/*.unit.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- |
| UNIT-01 | BR-07 | Password complexity: compliant password | Validated successfully | `password-policy.unit.test.ts` | Planned |
| UNIT-02 | BR-07 | Password complexity: missing uppercase, digit, or special character | Fails validation with specific field error | `password-policy.unit.test.ts` | Planned |
| UNIT-03 | BR-22 | Ticket lifecycle: permitted transitions (`NEW`→`OPEN`, `OPEN`→`IN_PROGRESS`, etc.) | Transition accepted | `status-transitions.unit.test.ts` | Planned |
| UNIT-04 | BR-22 | Ticket lifecycle: invalid transitions (`NEW`→`RESOLVED`, `CLOSED`→`OPEN`) | Rejected with `INVALID_STATUS_TRANSITION` | `status-transitions.unit.test.ts` | Planned |
| UNIT-05 | BR-27 | Comment and note text length bounds (1–2000 chars, whitespace trimming) | Empty/whitespace rejected; 1-2000 chars accepted | `comment-validation.unit.test.ts` | Planned |

### API Tests — `server/tests/lab-03/*.api.test.ts`

| Test ID | AC / BR | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-01, BR-01 | Login with valid credentials | 200 OK, sets `toktickit_session` cookie, returns user data | `auth.api.test.ts` | Planned |
| API-02 | AC-04, BR-10 | Login with inactive user account | 401 Unauthorized with `ACCOUNT_INACTIVE` error | `auth.api.test.ts` | Planned |
| API-03 | AC-02, BR-02 | User with `mustChangePassword` accessing protected API | 403 Forbidden with `PASSWORD_CHANGE_REQUIRED` | `auth.api.test.ts` | Planned |
| API-04 | AC-03, BR-12 | Successful mandatory password change | 200 OK, clears `mustChangePassword`, unlocks API access | `auth.api.test.ts` | Planned |
| API-05 | AC-05, BR-11 | Logout endpoint execution | 200 OK, clears session cookie; subsequent requests answer 401 | `auth.api.test.ts` | Planned |
| API-06 | AC-06, BR-03 | Requester ticket creation derives owner from session | 201 Created; `requesterId` in body rejected | `authorization.api.test.ts` | Planned |
| API-07 | AC-07, BR-16 | Requester fetching another user's Ticket | 404 Not Found (safe error, no enumeration) | `authorization.api.test.ts` | Planned |
| API-08 | AC-08, BR-17 | Requester requesting Internal Notes endpoint | 403 Forbidden without note data | `authorization.api.test.ts` | Planned |
| API-09 | AC-09, BR-24 | Requester indicates "Problem Appears Resolved" | 200 OK, `resolvedByRequester: true`, status unchanged | `authorization.api.test.ts` | Planned |
| API-10 | AC-10, FR-09 | IT Staff queries Ticket Queue with filters and pagination | 200 OK, returns filtered tickets and pagination metadata | `staff-queue.api.test.ts` | Planned |
| API-11 | AC-11, BR-23 | IT Staff claims unassigned ticket | 200 OK, sets `ticketOwnerId`, auto-advances `NEW` to `OPEN` | `staff-ticket-detail.api.test.ts` | Planned |
| API-12 | AC-12, BR-20 | IT Staff updates IT Priority to `CRITICAL` | 200 OK, `itPriority` updated, `requestedPriority` untouched | `staff-ticket-detail.api.test.ts` | Planned |
| API-13 | AC-13, BR-22 | IT Staff transitions status (`OPEN` → `IN_PROGRESS`) | 200 OK; invalid transition answers 400 Bad Request | `staff-ticket-detail.api.test.ts` | Planned |
| API-14 | AC-14, BR-04 | Post and get Public Comments on Ticket | 201 / 200; comment visible to Requester and Staff | `comments-notes.api.test.ts` | Planned |
| API-15 | AC-15, BR-04 | Post and get Internal Notes on Ticket | 201 / 200; note visible to Staff and Admin only | `comments-notes.api.test.ts` | Planned |
| API-16 | AC-08, BR-04 | Requester attempts to post Internal Note | 403 Forbidden | `comments-notes.api.test.ts` | Planned |
| API-17 | BR-14 | IT Staff attempts to access Admin User Management | 403 Forbidden | `authorization.api.test.ts` | Planned |
| API-18 | AC-16, FR-15 | Administrator retrieves user list with search and role filter | 200 OK, returns matching user profiles | `users-admin.api.test.ts` | Planned |
| API-19 | AC-17, BR-31 | Administrator creates user with duplicate email | 409 Conflict with `DUPLICATE_EMAIL` error code | `users-admin.api.test.ts` | Planned |
| API-20 | AC-18, BR-29 | Administrator attempts to deactivate own account | 400 Bad Request with `CANNOT_DEACTIVATE_SELF` | `users-admin.api.test.ts` | Planned |
| API-21 | AC-19, BR-30 | Administrator attempts to deactivate sole active Admin | 400 Bad Request with `CANNOT_DEACTIVATE_LAST_ADMIN` | `users-admin.api.test.ts` | Planned |
| API-22 | AC-20, BR-33 | Administrator resets initial password for a user | 200 OK, updates hash, sets `mustChangePassword: true` | `users-admin.api.test.ts` | Planned |
| API-23 | AC-21, BR-35 | Error envelopes conform to standard schema | Standardized `{ error: { code, message, fields? } }` | `auth.api.test.ts` | Planned |
| API-24 | BR-36 | Re-running database seed idempotency check | Seed runs twice without duplicate rows or errors | `users-admin.api.test.ts` | Planned |
| API-25 | AC-01, BR-09 | Login with incorrect password | 401 Unauthorized with generic safe error | `auth.api.test.ts` | Planned |

### UI Component Tests — `client/tests/lab-03/*.test.tsx`

| Test ID | AC / BR | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- |
| UI-01 | AC-01, AC-04 | Login form submission, busy state, and inactive account alert | Disables submit button, shows spinner, renders alert on failure | `Login.test.tsx` | Planned |
| UI-02 | AC-02, BR-02 | User flagged with `mustChangePassword` forced to change screen | Redirects away from normal routes to `/change-password` | `ChangePassword.test.tsx` | Planned |
| UI-03 | AC-03, BR-07 | Password change form checklist criteria validation | Validates length, case, digits, special chars in real-time | `ChangePassword.test.tsx` | Planned |
| UI-04 | AC-05, FR-04 | AppShell renders user name, role badge, and handles Logout | Displays name & badge; clicking Logout clears session and redirects | `AppShell.test.tsx` | Planned |
| UI-05 | AC-09, FR-08 | Requester clicks "Problem Appears Resolved" | Shows confirm dialog, updates indication state, disables button | `RequesterTicketDetail.test.tsx` | Planned |
| UI-06 | AC-10, FR-09 | IT Staff Queue renders table, search filter, and pagination | Renders columns, filters rows on search, paginates results | `StaffTicketQueue.test.tsx` | Planned |
| UI-07 | AC-11, BR-23 | IT Staff clicks "Claim" on unassigned ticket | Calls owner endpoint and updates owner display | `StaffTicketDetail.test.tsx` | Planned |
| UI-08 | AC-12, AC-13 | IT Staff modifies IT Priority and status dropdown | Sends PATCH requests and updates badge indicators | `StaffTicketDetail.test.tsx` | Planned |
| UI-09 | AC-14, FR-07 | Public Comments thread displays comments and accepts new post | Appends new comment to list with author badge and timestamp | `PublicComments.test.tsx` | Planned |
| UI-10 | AC-15, BR-04 | Internal Notes tab renders private warning and notes list | Displays amber security banner, lists private notes | `InternalNotes.test.tsx` | Planned |
| UI-11 | AC-16, FR-15 | Admin User Management displays user list and search filter | Lists users with role and status badges; filters by name/email | `UserManagement.test.tsx` | Planned |
| UI-12 | AC-17, BR-31 | Admin user creation displays validation error on duplicate email | Form renders field-level duplicate email error | `UserManagement.test.tsx` | Planned |
| UI-13 | AC-18, AC-19 | Admin edit user disables deactivation toggle on self & last admin | Switch disabled with tooltip explanation | `UserManagement.test.tsx` | Planned |
| UI-14 | AC-20, BR-33 | Admin resets initial password from edit drawer | Opens modal, captures password, displays success feedback | `UserManagement.test.tsx` | Planned |
| UI-15 | FR-20 | Role-based navigation hides unauthorized links | Requesters see no Queue or Admin; Staff see Queue only; Admin sees Users | `AppShell.test.tsx` | Planned |

### UI Style Tests — `client/tests/lab-03/style/*.test.tsx`

| Test ID | AC / BR | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- |
| STYLE-01 | ui-spec §1 | Zen Green color tokens and absence of external hex codes | Clean token application; no arbitrary inline hex | `theme.style.test.tsx` | Planned |
| STYLE-02 | ui-spec §3 | Role badges render correct semantic colors and text | Requester (green), Staff (blue), Admin (purple) | `badges.style.test.tsx` | Planned |
| STYLE-03 | ui-spec §3 | Priority badges render correct semantic colors and text | Low, Medium, High, Critical distinct | `badges.style.test.tsx` | Planned |
| STYLE-04 | ui-spec §3 | Status badges render correct semantic colors and text | 8 distinct status presentations verified | `badges.style.test.tsx` | Planned |
| STYLE-05 | ui-spec §4 | Internal Notes tab renders amber warning callout styling | Amber callout surface and border verified | `notes.style.test.tsx` | Planned |

### Responsive Tests — `e2e/lab-03/responsive.spec.ts`

| Test ID | Viewport | What It Tests | Expected Result | Final |
| --- | --- | --- | --- | --- |
| RESP-01 | Desktop (1280px) | Full multi-column tables, queue, and side panels | Clean spacing, no clipping, no overflow | Planned |
| RESP-02 | Tablet (768px) | Condensed tables, 2-column forms, drawer overlays | Elements adapt cleanly without horizontal scroll | Planned |
| RESP-03 | Mobile (390px) | Queue transforms to cards; full-width action buttons | Touch targets ≥44px, zero horizontal overflow | Planned |
| RESP-04 | Mobile (390px) | Admin User Management responsive layout | User list and drawer fit viewport cleanly | Planned |

### End-to-End Tests — `e2e/lab-03/*.spec.ts`

| Test ID | AC Trace | User Journey | Automated Test File | Final |
| --- | --- | --- | --- | --- |
| E2E-01 | AC-01, AC-05 | Complete login, role shell display, and logout flow | `authentication.spec.ts` | Planned |
| E2E-02 | AC-02, AC-03 | Mandatory first-login password change and app entry | `authentication.spec.ts` | Planned |
| E2E-03 | AC-10, AC-11, AC-14, AC-15 | Staff workflow: queue, claim ticket, update priority/status, add comment and note | `staff-ticket-flow.spec.ts` | Planned |
| E2E-04 | AC-16, AC-17, AC-18, AC-20 | Admin workflow: create user, search, edit, reset password, prevent self-deactivation | `user-administration.spec.ts` | Planned |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Planned Tests | Coverage Level |
| --- | --- | --- |
| **AC-01** (Valid login) | `API-01`, `API-25`, `UI-01`, `E2E-01` | API + UI + E2E |
| **AC-02** (Must change password gate) | `API-03`, `UI-02`, `E2E-02` | API + UI + E2E |
| **AC-03** (Change password execution) | `API-04`, `UI-03`, `E2E-02` | API + UI + E2E |
| **AC-04** (Inactive account login failure) | `API-02`, `UI-01` | API + UI |
| **AC-05** (Logout session invalidation) | `API-05`, `UI-04`, `E2E-01` | API + UI + E2E |
| **AC-06** (Requester session ownership) | `API-06` | API |
| **AC-07** (Requester cross-owner access 404) | `API-07` | API |
| **AC-08** (Requester internal note forbidden) | `API-08`, `API-16` | API |
| **AC-09** (Requester resolution indication) | `API-09`, `UI-05` | API + UI |
| **AC-10** (IT Staff Queue query/filter) | `API-10`, `UI-06`, `E2E-03` | API + UI + E2E |
| **AC-11** (IT Staff claims unassigned ticket) | `API-11`, `UI-07`, `E2E-03` | API + UI + E2E |
| **AC-12** (IT Staff updates IT Priority) | `API-12`, `UI-08` | API + UI |
| **AC-13** (IT Staff transitions ticket status) | `API-13`, `UNIT-03`, `UNIT-04`, `UI-08` | Unit + API + UI |
| **AC-14** (Public Comments discussion) | `API-14`, `UI-09`, `E2E-03` | API + UI + E2E |
| **AC-15** (Internal Notes discussion) | `API-15`, `UI-10`, `E2E-03` | API + UI + E2E |
| **AC-16** (Admin lists and searches users) | `API-18`, `UI-11`, `E2E-04` | API + UI + E2E |
| **AC-17** (Admin duplicate email conflict) | `API-19`, `UI-12` | API + UI |
| **AC-18** (Admin cannot deactivate self) | `API-20`, `UI-13`, `E2E-04` | API + UI + E2E |
| **AC-19** (Cannot deactivate sole active admin) | `API-21`, `UI-13` | API + UI |
| **AC-20** (Admin resets initial password) | `API-22`, `UI-14`, `E2E-04` | API + UI + E2E |
| **AC-21** (Structured validation errors) | `API-23` | API |

---

## 4. Test Commands

```bash
# Run all unit and integration tests (Client + Server)
rtk pnpm test

# Run server API tests specifically
rtk pnpm --filter server test

# Run client UI tests specifically
rtk pnpm --filter client test

# Run Playwright End-to-End tests
rtk pnpm test:e2e
```
