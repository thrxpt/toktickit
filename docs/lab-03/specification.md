# Lab 3 Sprint Engineering Specification

Companion documents forming the complete Sprint 3 contract:
[`api-spec.md`](./api-spec.md), [`ui-spec.md`](./ui-spec.md), [`tests.md`](./tests.md).
Domain terminology is defined by [`CONTEXT.md`](../../CONTEXT.md). Architectural
decisions are recorded in [`docs/adr/`](../adr/).

---

## 1. Sprint Goal

Deliver authentic multi-role operations for TokTickIT by replacing the temporary
Development Requester selector with secure authentication and server-side role-based
authorization across Requester, IT Staff, and Administrator. Requesters authenticate
to manage their own Tickets and Attachments without regression, participate in
bidirectional Public Comments, and indicate problem resolution. IT Staff operate a
shared Ticket Queue to prioritize, claim, reassign, transition statuses, comment
publicly, and record private Internal Notes. Administrators manage user accounts and
initial credentials through a dedicated, safe interface.

---

## 2. Stakeholder Request Interpretation

The IT department requires TokTickIT to transition from a single-user prototype into
an authenticated multi-role service desk. The temporary `Development Requester`
dropdown must be eliminated and replaced with standard email/password authentication.
Initial passwords issued by administrators must trigger a mandatory change at first login
before any application screens become accessible.

System roles must be strictly partitioned:

1. **Requesters** must retain all ticket creation, listing, detail, and attachment
   capabilities proven in Lab 2, but identity must be derived strictly from the
   authenticated session. Requesters can communicate via Public Comments and indicate
   that their reported issue appears resolved, but they cannot formally resolve or close
   Tickets.
2. **IT Staff** require a responsive, paginated Ticket Queue to search, filter, and sort
   incoming workload. In Ticket Detail, IT Staff must be able to claim ownership,
   reassign to colleagues, set IT Priority, execute permitted lifecycle status transitions,
   post Public Comments, and author private Internal Notes hidden from Requesters.
3. **Administrators** require a minimalist User Management screen to search, view, create,
   edit basic account info, assign one permitted role, toggle activation, and issue new
   initial passwords. To protect system integrity, administrators cannot deactivate their
   own account, remove the last active administrator, or delete accounts.

Hiding UI elements is explicitly recognized as insufficient: every restriction must be
strictly enforced server-side. The Zen Green design system must remain consistent across
all new and existing screens.

---

## 3. Scope

### Included

- **Authentication & Sessions**: Email and password authentication, cookie-based session
  tokens (with Bearer header support for tests), current authenticated user endpoint,
  logout invalidation, and inactive account rejection.
- **Mandatory Password Change**: Detection of `mustChangePassword`, mandatory password
  change screen blocking normal application navigation until a compliant new password
  is saved.
- **Role-Based Access Control (RBAC)**: Strict server-side authorization for `REQUESTER`,
  `IT_STAFF`, and `ADMINISTRATOR`. Disjoint role routing and navigation.
- **Requester Continuity & Regression**: Full preservation of Lab 2 ticket creation,
  My Tickets, Ticket Detail, and Attachment upload/download/soft-removal using the
  authenticated Requester identity. Removal of the Development Requester selector.
- **IT Staff Ticket Queue**: Search over ticket number and summary; filters for Category,
  Status, IT Priority, and Owner; multi-column sorting; pagination; responsive desktop
  table and mobile card views.
- **IT Staff Ticket Operations**: Primary Ticket Owner assignment/claiming/reassignment;
  IT Priority management; server-validated status transition workflow; read-only
  presentation of Requester-submitted details.
- **Two-Tier Communication**: Append-only Public Comments (visible to Requester, IT Staff,
  Admin) and Internal Notes (strictly visible only to IT Staff and Admin; rejected with
  403/404 for Requesters).
- **Requester Resolution Indication**: "Problem Appears Resolved" toggle/action available
  to the owning Requester without altering formal ticket status.
- **Administrator User Management**: Minimalist user table with search by name/email and
  role filtering; create user modal/drawer with initial password; edit name, email, role,
  and activation status; reset initial password; administrative safety rules (no self-
  deactivation, no deactivation of last admin, no account deletion).
- **Database Evolution & Migration**: Prisma schema migration evolving `Requester` to
  `User`, foreign keys, sequence maintenance, and idempotent seeding with realistic
  accounts across all three roles and ticket states.
- **Automated Verification**: Complete suite of unit, API, UI, responsive, and Playwright
  E2E tests traced to acceptance criteria.

### Explicitly Excluded

- Self-registration / public user signup.
- Email delivery of invitations, password reset links, or ticket notifications.
- Multi-factor authentication (MFA), social login, or single sign-on (SSO).
- Multiple roles assigned to a single user.
- Hard user deletion, bulk user operations, user CSV/JSON import or export.
- Department, organization, location, or profile picture management.
- IT Staff "Actions Taken" / "Service Actions" checklist (deferred to Lab 4).
- Formal SLA timers, escalations, automated queue assignments, or KPI dashboards.
- Hard deletion of tickets, comments, notes, or attachments.

---

## 4. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-01 | A user authenticates by supplying an email address and password; the system validates credentials and establishes an authenticated session. |
| FR-02 | An unauthenticated user accessing protected routes is redirected to the Login screen. |
| FR-03 | A user flagged with `mustChangePassword: true` is redirected to the Change Password screen upon login, and cannot reach application routes until a valid new password is confirmed. |
| FR-04 | The application shell renders the authenticated user's name and role badge, exposes role-permitted navigation links, and provides a Logout action. |
| FR-05 | Logging out terminates the session and redirects the user to the Login screen. |
| FR-06 | A Requester creates Tickets, lists owned Tickets in My Tickets, views owned Ticket Details, and manages Attachments using their authenticated identity, without the Development Requester selector. |
| FR-07 | A Requester can post a Public Comment to a Ticket they own and view all existing Public Comments on that Ticket. |
| FR-08 | A Requester can mark a Ticket they own with "Problem Appears Resolved"; the system records this indicator without mutating the formal Ticket Status. |
| FR-09 | IT Staff can view the IT Staff Ticket Queue with search by ticket number/summary, filter by category/status/priority/owner, sort by supported columns, and paginate through results. |
| FR-10 | IT Staff can open any Ticket Detail to view all requester data, attachments, public comments, and internal notes. |
| FR-11 | IT Staff can claim ownership of an unassigned Ticket or reassign ownership to another active IT Staff or Administrator. |
| FR-12 | IT Staff can update a Ticket's IT Priority to any permitted priority level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). |
| FR-13 | IT Staff can transition a Ticket's status according to the permitted status transition matrix. |
| FR-14 | IT Staff can post Public Comments and private Internal Notes to any Ticket. |
| FR-15 | An Administrator can access the User Management screen, search users by name or email, and filter the list by role. |
| FR-16 | An Administrator can create a new user account with full name, email address, one role, activation state, and an initial password. |
| FR-17 | An Administrator can edit an existing user's full name, email address, role, and activation state. |
| FR-18 | An Administrator can assign a new initial password to any user, automatically setting `mustChangePassword: true`. |
| FR-19 | The system prevents an Administrator from deactivating their own account and prevents deactivating the last active Administrator in the system. |
| FR-20 | Every protected endpoint enforces server-side authentication and role-based authorization; unauthorized attempts answer 401, 403, or 404 without leaking confidential resource existence. |

---

## 5. Business Rules

### Mandatory Handout Business Rules (Verbatim)

| ID | Rule |
| --- | --- |
| BR-01 | Only an active user with valid credentials may authenticate. |
| BR-02 | A user marked as requiring a password change cannot enter the normal application until a new valid password is saved. |
| BR-03 | The authenticated user identity, not a requesterId supplied by the client, determines ownership of Requester operations. |
| BR-04 | Public Comments are visible to the Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator. |
| BR-05 | A Requester may indicate that the problem appears resolved, but cannot formally set the Ticket to Resolved or Closed. |

### Authentication and Session Rules

| ID | Rule |
| --- | --- |
| BR-06 | Passwords must never be stored in plaintext. Passwords are salted and hashed using `bcrypt` with a minimum work factor of 10. |
| BR-07 | New passwords must be at least 8 characters in length and contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character. |
| BR-08 | Authentication sessions are transported via an `httpOnly`, `SameSite=Lax` cookie named `toktickit_session`. API requests also accept an `Authorization: Bearer <token>` header as a direct fallback for testing. |
| BR-09 | Failed login attempts return a generic error message ("Invalid email or password") regardless of whether the email exists, preventing user enumeration. |
| BR-10 | Inactive user accounts (`isActive: false`) are rejected at login with an explicit account inactive notice ("Account is deactivated. Please contact an administrator."). |
| BR-11 | Logging out invalidates the session cookie and immediately clears client-side authentication state. |
| BR-12 | When a user changes their password on the mandatory change screen, `mustChangePassword` is set to `false`, and the user transitions into the authenticated application shell matching their role. |

### Role and Authorization Rules

| ID | Rule |
| --- | --- |
| BR-13 | Every user has exactly one assigned role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multiple roles are prohibited. |
| BR-14 | Administrators and IT Staff are segregated: Administrators cannot access the IT Staff Queue or claim/modify tickets; IT Staff cannot access User Management (ADR-0008). |
| BR-15 | A Requester attempting to access staff or admin routes receives `403 Forbidden`. Unauthenticated requests receive `401 Unauthorized`. |
| BR-16 | When a Requester requests a Ticket or Attachment they do not own, the system returns `404 Not Found` to avoid confirming the resource's existence (ADR-0005). |
| BR-17 | When a Requester attempts to read or write Internal Notes, the system responds with `403 Forbidden` without returning any note data. |

### Ticket Lifecycle and Operational Rules

| ID | Rule |
| --- | --- |
| BR-18 | A Ticket may have zero or one primary Ticket Owner. The Ticket Owner must be an active user with role `IT_STAFF` or `ADMINISTRATOR`. |
| BR-19 | Upon Ticket creation, IT Priority is initialized with the value of Requested Priority (`LOW`, `MEDIUM`, or `HIGH`). |
| BR-20 | Only IT Staff or Administrator may update IT Priority. Permitted IT Priority values are `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`. |
| BR-21 | Permitted Ticket statuses are: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`. |
| BR-22 | Ticket status transitions follow a validated lifecycle matrix: `NEW` → `OPEN`, `IN_PROGRESS`, `CANCELLED`; `OPEN` → `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`; `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`; `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`; `RESOLVED` → `CLOSED`, `REOPENED`; `CLOSED` → `REOPENED`; `REOPENED` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`; `CANCELLED` is terminal. |
| BR-23 | Claiming a Ticket sets `ticketOwnerId` to the authenticated user. Reassigning sets `ticketOwnerId` to the specified active IT Staff or Administrator. If a Ticket is in `NEW` status, claiming or assigning automatically advances status to `OPEN`. |
| BR-24 | A Requester can flag `resolvedByRequester: true` on an owned Ticket that is not `CLOSED` or `CANCELLED`. This provides feedback to IT Staff but does not change `status`. |

### Public Comments and Internal Notes

| ID | Rule |
| --- | --- |
| BR-25 | Public Comments and Internal Notes are append-only. Updating or deleting existing comments or notes is strictly prohibited. |
| BR-26 | Each comment or note records the authenticated author's user ID and a server-generated creation timestamp. |
| BR-27 | Comment and note text must be trimmed of whitespace, required, and bounded between 1 and 2,000 characters. Whitespace-only submissions are rejected. |
| BR-28 | Comments and notes are displayed in chronological order (oldest to newest) to preserve conversational context. |

### Administrator User Management Rules

| ID | Rule |
| --- | --- |
| BR-29 | An Administrator cannot deactivate their own user account. |
| BR-30 | An Administrator cannot deactivate or change the role of the last remaining active Administrator. |
| BR-31 | Email addresses must be unique across all users (case-insensitive). Duplicate email creation or modification is rejected with a `DUPLICATE_EMAIL` error. |
| BR-32 | User accounts are deactivated (`isActive: false`), never deleted. Hard deletion of users is prohibited to preserve ticket audit integrity. |
| BR-33 | An Administrator setting a new initial password for a user must supply a valid initial password (minimum 8 characters) and automatically marks `mustChangePassword: true`. |
| BR-34 | A deactivated user cannot authenticate; existing active sessions for that user are rejected on their next API interaction. |

### System Behavior and Data Integrity

| ID | Rule |
| --- | --- |
| BR-35 | Error responses never expose stack traces, SQL, Prisma errors, filesystem paths, or internal identifiers. |
| BR-36 | The database seed is idempotent: repeated runs upsert on natural keys and never create duplicates or errors. |

---

## 6. UI Specification Summary

Full visual system, token usage, component definitions, and responsive rules are detailed
in [`ui-spec.md`](./ui-spec.md).

- **Theme Consistency**: Continues the Zen Green design system (`--zen-primary: #005a36`,
  `--zen-surface: #f4f8f5`, `--zen-border: #d2e3d8`) without external CSS libraries or
  hard-coded hex values outside `client/src/styles/theme.css`.
- **Navigation & App Shell**:
  - Unauthenticated view: Clean card layout centered on screen with TokTickIT branding.
  - Authenticated view: Header contains brand icon, role-specific navigation tabs,
    user avatar initials, user name, role badge, and a profile dropdown containing Logout.
  - Role navigation destinations:
    - `REQUESTER`: My Tickets, Create Ticket.
    - `IT_STAFF`: Ticket Queue.
    - `ADMINISTRATOR`: User Management.
- **Screens**:
  1. **Login (`/login`)**: Email, password with toggle visibility, inline error alert,
     busy spinner during authentication.
  2. **Change Password (`/change-password`)**: Current temporary password, new password,
     confirm password, live validation criteria checklist.
  3. **IT Staff Ticket Queue (`/staff/queue`)**: Search input, filter toolbar (Category,
     Status, IT Priority, Owner), table with sortable headers, badges for priority and
     status, pagination controls, and mobile card view.
  4. **IT Staff Ticket Detail (`/staff/tickets/:id`)**: Breadcrumb navigation, metadata
     summary grid, editable dropdowns for Owner, IT Priority, and Status with save feedback,
     read-only Requester info, tabbed panel containing Public Comments, Internal Notes
     (styled with distinct private warning styling), and Attachments.
  5. **Admin User Management (`/admin/users`)**: Search bar, role filter dropdown, user
     table (Name, Email, Role badge, Status badge, Edit action), and a slide-in Drawer / Modal
     for user creation and editing, self-deactivation safeguards, and initial password reset.

---

## 7. Data Changes

### Database Evolution Strategy

Lab 3 replaces the standalone `Requester` table with an integrated `User` table, preserving
all existing primary keys and foreign key references from Lab 2's `Ticket` and `Attachment`
tables.

1. Create enum `Role`: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
2. Create enum `ITPriority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
3. Expand enum `TicketStatus`: add `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`,
   `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
4. Migrate `Requester` table into `User`:
   - Retain existing `id`, `name`, `email`, `isActive`, `createdAt`, `updatedAt`.
   - Add `passwordHash` (`String`).
   - Add `role` (`Role`, default `REQUESTER`).
   - Add `mustChangePassword` (`Boolean`, default `false`).
5. Update `Ticket` table:
   - Foreign key `requesterId` references `User(id)`.
   - Add nullable foreign key `ticketOwnerId` referencing `User(id)` (restricted to IT Staff/Admin).
   - Add column `itPriority` (`ITPriority`, initialized from `requestedPriority`).
   - Add column `resolvedByRequester` (`Boolean`, default `false`).
6. Create `Comment` model:
   - `id` (Int, autoincrement primary key).
   - `ticketId` (Int, references `Ticket(id)` on delete restrict).
   - `authorId` (Int, references `User(id)` on delete restrict).
   - `content` (String).
   - `createdAt` (DateTime, default `now()`).
7. Create `InternalNote` model:
   - `id` (Int, autoincrement primary key).
   - `ticketId` (Int, references `Ticket(id)` on delete restrict).
   - `authorId` (Int, references `User(id)` on delete restrict).
   - `content` (String).
   - `createdAt` (DateTime, default `now()`).

### Indexes and Performance

| Table | Index / Constraint | Purpose |
| --- | --- | --- |
| `User` | `email` UNIQUE | BR-31 duplicate email prevention |
| `User` | `(role, isActive)` | Fast lookup of active assignable staff |
| `Ticket` | `(ticketOwnerId, status)` | Fast filtering in IT Staff Queue |
| `Ticket` | `(itPriority, status)` | Fast queue prioritization queries |
| `Comment` | `(ticketId, createdAt asc)` | Ordered retrieval of public ticket discussions |
| `InternalNote` | `(ticketId, createdAt asc)` | Ordered retrieval of private ticket notes |

### Idempotent Seed Data

The database seed must be safe to re-run without duplicating records:

- **Requesters**: 4 active (`jennifer.anderson@example.ac.th`, `somchai.prasert@example.ac.th`,
  `kanya.s@example.ac.th`, `chatchai.n@example.ac.th`), 1 inactive (`retired.staff@example.ac.th`).
- **IT Staff**: 3 active (`michael.brown@toktickit.com`, `sarah.johnson@toktickit.com`,
  `david.lee@toktickit.com`), 1 inactive (`former.agent@toktickit.com`).
- **Administrator**: 1 active (`admin@toktickit.com`).
- **Tickets**: Realistic ticket distribution across categories, statuses, priorities, and
  ownership states.
- **Discussions**: Sample Public Comments and Internal Notes on populated tickets.
- All seeded users have a known development password (`Password123!`). Seeded user
  `somchai.prasert@example.ac.th` is seeded with `mustChangePassword: true` for testing.

---

## 8. API Contract Summary

Full JSON schemas, parameters, and error envelopes are detailed in [`api-spec.md`](./api-spec.md).

### Core Endpoints

| Category | Method & Path | Permitted Roles | Description |
| --- | --- | --- | --- |
| **Auth** | `POST /api/auth/login` | Public | Authenticate with email and password |
| **Auth** | `POST /api/auth/logout` | Authenticated | Terminate session and clear cookie |
| **Auth** | `GET /api/auth/me` | Authenticated | Retrieve current user profile and role |
| **Auth** | `POST /api/auth/change-password` | Authenticated | Complete mandatory first-login password change |
| **Requester** | `GET /api/tickets` | Requester | List owned tickets with search, filter, sort, pagination |
| **Requester** | `POST /api/tickets` | Requester | Create a new ticket (system sets requesterId) |
| **Requester** | `GET /api/tickets/:id` | Requester | View owned ticket detail |
| **Requester** | `POST /api/tickets/:id/attachments` | Requester | Upload attachment to owned ticket |
| **Requester** | `GET /api/attachments/:id/content` | Requester / Staff | Download active attachment |
| **Requester** | `POST /api/attachments/:id/remove` | Requester | Soft-remove attachment on owned ticket |
| **Requester** | `POST /api/tickets/:id/resolve-indication` | Requester | Indicate problem appears resolved |
| **Staff** | `GET /api/staff/tickets` | IT Staff, Admin | Paginated, filterable IT Staff Ticket Queue |
| **Staff** | `GET /api/staff/tickets/:id` | IT Staff, Admin | Comprehensive ticket detail for staff operations |
| **Staff** | `PATCH /api/staff/tickets/:id/owner` | IT Staff, Admin | Claim or reassign ticket owner |
| **Staff** | `PATCH /api/staff/tickets/:id/priority` | IT Staff, Admin | Update IT Priority |
| **Staff** | `PATCH /api/staff/tickets/:id/status` | IT Staff, Admin | Execute validated status transition |
| **Comments** | `GET /api/tickets/:id/comments` | Requester (owned), Staff, Admin | List public comments |
| **Comments** | `POST /api/tickets/:id/comments` | Requester (owned), Staff, Admin | Post public comment |
| **Notes** | `GET /api/tickets/:id/notes` | IT Staff, Admin | List internal notes (Requester receives 403) |
| **Notes** | `POST /api/tickets/:id/notes` | IT Staff, Admin | Post internal note (Requester receives 403) |
| **Admin** | `GET /api/admin/users` | Admin | List users with search and role filter |
| **Admin** | `POST /api/admin/users` | Admin | Create user with initial password |
| **Admin** | `PATCH /api/admin/users/:id` | Admin | Edit user details and active status |
| **Admin** | `POST /api/admin/users/:id/reset-password` | Admin | Assign new initial password |

---

## 9. Acceptance Criteria

| ID | Criterion (Given-When-Then) |
| --- | --- |
| AC-01 | **Given** an active user with valid credentials, **when** the user posts to `/api/auth/login`, **then** the backend establishes an authenticated session, sets the `toktickit_session` cookie, and returns the user's id, name, email, and role. |
| AC-02 | **Given** a user with `mustChangePassword: true`, **when** login succeeds, **then** normal application routes remain inaccessible and the client is forced to the Change Password screen until a compliant new password is saved. |
| AC-03 | **Given** an authenticated user on the Change Password screen, **when** they submit a compliant password matching confirmation, **then** `mustChangePassword` is cleared, and access to role-permitted application routes is unlocked. |
| AC-04 | **Given** an inactive user account (`isActive: false`), **when** attempting to log in, **then** authentication fails with a 401 status and an explicit deactivation message without leaking sensitive account internals. |
| AC-05 | **Given** an authenticated user, **when** they trigger `/api/auth/logout`, **then** the session cookie is invalidated and subsequent requests to protected endpoints return 401. |
| AC-06 | **Given** an authenticated Requester, **when** they create or list Tickets, **then** the system derives identity solely from the session; any client-supplied `requesterId` in request bodies is rejected or ignored. |
| AC-07 | **Given** an authenticated Requester, **when** attempting to access another user's Ticket or Attachment, **then** the system returns 404 Not Found identically to a non-existent row. |
| AC-08 | **Given** an authenticated Requester, **when** they request an Internal Note endpoint, **then** the request is rejected with 403 Forbidden and no note content is returned. |
| AC-09 | **Given** an authenticated Requester, **when** they submit "Problem Appears Resolved", **then** `resolvedByRequester` is recorded as true, but the Ticket status remains unchanged. |
| AC-10 | **Given** an IT Staff user, **when** querying `/api/staff/tickets` with search, category, status, priority, or owner filters, **then** the matching tickets are returned with pagination metadata. |
| AC-11 | **Given** an IT Staff user, **when** claiming an unassigned Ticket, **then** `ticketOwnerId` is updated to that staff member's ID and status advances from `NEW` to `OPEN`. |
| AC-12 | **Given** an IT Staff user, **when** updating IT Priority to `CRITICAL`, **then** the priority is updated without altering the original `requestedPriority`. |
| AC-13 | **Given** an IT Staff user, **when** executing a permitted status transition (e.g., `OPEN` → `IN_PROGRESS`), **then** the status updates successfully; invalid transitions (e.g., `NEW` → `RESOLVED`) are rejected with 400 Bad Request. |
| AC-14 | **Given** a Ticket, **when** an authorized user posts a Public Comment, **then** it appears in the public thread visible to Requester, Staff, and Admin. |
| AC-15 | **Given** a Ticket, **when** an IT Staff member posts an Internal Note, **then** it is visible in the internal notes thread to Staff and Admin, and absent from Requester view. |
| AC-16 | **Given** an Administrator, **when** viewing User Management, **then** all users are listed with name, email, role badge, and active status badge. |
| AC-17 | **Given** an Administrator, **when** creating a user with a duplicate email, **then** the creation is rejected with a 409 Conflict error. |
| AC-18 | **Given** an Administrator, **when** attempting to deactivate their own account, **then** the action is rejected with a 400 Bad Request safety error. |
| AC-19 | **Given** the sole active Administrator in the system, **when** attempting to deactivate that user or change their role, **then** the action is rejected to prevent lockout. |
| AC-20 | **Given** an Administrator, **when** resetting a user's initial password, **then** the password hash updates and `mustChangePassword` is reset to true. |
| AC-21 | **Given** any protected API endpoint, **when** an invalid payload or non-numeric parameter is provided, **then** the system responds with 400 Bad Request and structured error fields. |

---

## 10. Product Definition of Done

### Product Increment Definition of Done

1. **Authentication & First-Login Security**:
   - Working login with valid credentials and safe error handling for invalid/inactive accounts.
   - Forced first-login password change for initial passwords.
   - Clean logout destroying session state.
2. **Role-Based Navigation & Shell**:
   - App shell displays authenticated user name, role badge, and role-specific navigation.
   - Unauthorized routes redirect or render forbidden states.
3. **Requester Regression Continuity**:
   - Create Ticket, My Tickets, Ticket Detail, and Attachment upload/download/soft-removal
     continue to pass with zero regressions using authenticated identity.
   - Development Requester selector completely removed from code and UI.
4. **IT Staff Operational Workflow**:
   - Shared Ticket Queue renders real data, search, category/status/priority/owner filters,
     sorting, and pagination on desktop and mobile.
   - IT Staff Ticket Detail allows claiming, reassigning, adjusting IT Priority, and
     validating status transitions.
5. **Two-Tier Discussions**:
   - Public Comments work for Requesters and IT Staff.
   - Internal Notes strictly inaccessible to Requesters.
   - Requester can signal "Problem Appears Resolved".
6. **Administrator User Management**:
   - Working User Management screen to list, search, filter, create, and edit users.
   - Initial password reset working end to end.
   - Self-deactivation and last-admin-deactivation prevention verified.

### Engineering Definition of Done

1. **Test Coverage**:
   - Every Acceptance Criterion (AC-01 through AC-21) maps directly to automated tests in `tests.md`.
   - Unit tests, API integration tests (Supertest against `toktickit_test`), UI tests
     (Testing Library), and E2E specs (Playwright) all pass cleanly.
2. **Zero Regressions**:
   - All Lab 1 and Lab 2 automated test suites continue to pass without modification or skips.
3. **Database Integrity**:
   - Prisma schema migrates cleanly from Lab 2 state without losing existing tickets or attachments.
   - Database seed is idempotent (`pnpm db:seed` runnable repeatedly without duplication).
4. **Code Quality**:
   - Type-checked (`tsc -b`), lint-clean (`oxlint` / `eslint`), and formatted.
   - No hard-coded hex colors outside `client/src/styles/theme.css`.
   - Error envelopes follow the standardized `{ error: { code, message, fields? } }` structure.
5. **Git Workflow**:
   - Contract PR merged into `lab3-staging` before implementation PRs begin.
   - Individual feature branches merged into `lab3-staging` through reviewed PRs.
   - `lab3-staging` merged into `main` for final release.

---

## 11. Assumptions and Decisions

- **D-17 (Authentication Transport)**: Authenticated sessions use signed session tokens
  transported in an `httpOnly`, `SameSite=Lax` cookie (`toktickit_session`), with fallback
  inspection of `Authorization: Bearer <token>` for automated Supertest suites.
  *Beat*: Storing tokens in client `localStorage` (vulnerable to XSS) or pure cookies without
  Bearer support (cumbersome for multi-agent API testing). Recorded in ADR-0007.
- **D-18 (Role Segregation)**: Administrators manage user accounts; IT Staff manage tickets.
  Administrators cannot claim tickets or browse the queue; IT Staff cannot access user
  management. *Beat*: Granting Administrators universal superuser rights, which would
  violate least privilege and complicate ticket queue ownership. Recorded in ADR-0008.
- **D-19 (Requester Resolution Indication)**: Requester problem resolution is stored as a
  boolean flag (`resolvedByRequester: true`) on the Ticket record rather than mutating
  `status`. Only IT Staff can formally transition the ticket to `RESOLVED` or `CLOSED`.
  *Beat*: Creating a duplicate pseudo-status `RESOLVED_BY_REQUESTER`.
- **D-20 (Comment & Note Append-Only Model)**: Comments and Internal Notes cannot be edited
  or soft-removed in Lab 3. They are permanent, append-only operational logs.
  *Beat*: Adding edit/delete endpoints, which was explicitly excluded in handout §4.6.
- **D-21 (User Deactivation Over Deletion)**: Deleting users is prohibited. User accounts
  are deactivated via `isActive: false`. Foreign key integrity on created tickets,
  attachments, comments, and notes remains strictly preserved.
