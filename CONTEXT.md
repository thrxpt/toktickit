# TokTickIT

An IT service desk where staff raise requests and support agents work them. The
product is built one vertical slice at a time — each Lab ships a thin path
through every layer rather than a finished layer.

## Language

### Domain

**Ticket**:
One IT support request raised by a Requester — a problem described, classified,
prioritised, and submitted. A Ticket belongs to exactly one Requester and is
visible to nobody else until IT Staff arrive in a later Lab.
_Avoid_: Case, request, job, issue — **issue** especially, which belongs to the
course's own process vocabulary below

**Ticket Number**:
The official human-facing identifier the backend generates on creation, shaped
`TKT-<year>-<six digits>`. Distinct from the Ticket's database id, which is what
URLs and the API actually address. Requesters quote the Ticket Number; nothing
looks anything up by it.
_Avoid_: Ticket ID, reference number, case number

**Requester**:
A person who raises Tickets. A permanent domain role — Lab 3 gives Requesters
real credentials, and later Labs add other roles alongside them, but a Requester
is who they are regardless of how they sign in.
_Avoid_: User, customer, employee, end user

**Development Requester**:
The Requester selected on the Lab-2 selection screen, standing in as "who is
using the app" until authentication existed. Retired in Lab 3 when real
authentication replaced it.
_Avoid_: Logged-in user, current user, session, identity

**User**:
An authenticated account in TokTickIT with an email address, hashed password,
activation status (`isActive`), mandatory first-login password change flag
(`mustChangePassword`), and exactly one Role (`REQUESTER`, `IT_STAFF`, or
`ADMINISTRATOR`).

**Role**:
The single authorization category assigned to a User. Lab 3 supports three
mutually exclusive roles: Requester, IT Staff, and Administrator. Users have
exactly one role.

**IT Staff**:
An operational role responsible for working Tickets: finding them in the shared
Ticket Queue, claiming or reassigning ownership, setting IT Priority, performing
permitted status transitions, posting Public Comments, and recording private
Internal Notes.

**Administrator**:
An administrative role responsible for minimalist User Management: viewing
users, creating accounts with an initial password, editing basic account
details, assigning one role, and activating/deactivating accounts. Administrators
do not manage Tickets.

**Ticket Owner**:
The active IT Staff or Administrator user currently assigned primary operational
responsibility for a Ticket. A Ticket may initially be unassigned.

**Requested Priority**:
The priority initially selected by the Requester (`LOW`, `MEDIUM`, `HIGH`).
Immutable after Ticket creation.

**IT Priority**:
The operational priority evaluated and managed by IT Staff or Administrator
(`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). Initially initialized from Requested
Priority, editable only by IT Staff or Administrator.

**Public Comment**:
An append-only message posted to a Ticket, visible to the Requester, IT Staff,
and Administrator. Authorship and creation timestamp are recorded by the backend.

**Internal Note**:
An append-only private operational note posted to a Ticket, visible strictly to
IT Staff and Administrator. Forbidden and invisible to Requesters.

**Current Status**:
The lifecycle status of a Ticket: `NEW`, `OPEN`, `IN_PROGRESS`,
`WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, or `CANCELLED`.
Transitions are strictly governed by role and server-side rules.

**Problem Appears Resolved**:
An indication provided by a Requester signaling that their issue seems resolved.
It does not formally close or resolve the Ticket; IT Staff remain responsible
for the formal status transition.

**Initial Password**:
A temporary password assigned by an Administrator upon user creation or reset,
triggering mandatory first-login password change before any application routes
can be accessed.

**Category**:
A kind of IT request a person can raise — Account and Access, Hardware,
Software, Network. Seeded reference data, not something users create.
_Avoid_: Type, tag, department, ticket category

**Related System**:
The specific service, application, device, or platform a Ticket is about —
Email, Campus Wi-Fi, VPN, LEB2 App, Printer, Corporate Laptop. Seeded reference
data, independent of Category: a Printer problem may be Hardware or Network, and
the Related System does not narrow the Category or vice versa.
_Avoid_: Asset, service, application, affected system

**Attachment**:
A file a Requester adds as supporting evidence for one of their Tickets — an
image or a PDF, at most five active per Ticket. Metadata lives in the database;
the bytes live on disk under a generated key that is never the uploader's
filename.
_Avoid_: File, upload, document, evidence

**Soft removal**:
Taking an Attachment out of use without destroying it: the row is marked with
who removed it, when, and why, and the file stops being downloadable or
previewable. The Attachment stays visible as metadata, which is the point — a
removal is a recorded act, not a disappearance. Contrast with deletion, which
TokTickIT does not do.
_Avoid_: Delete, archive, hide, trash

**System Status**:
The page's verdict on whether the whole Check System flow succeeded, rendered as
**Online** or **Offline**. It is not a mirror of any single endpoint: with the
API up but the database down, System Status reads Offline.
_Avoid_: Health status, server status, API status

**Health**:
What `GET /api/health` reports about the API process itself (`status: "ok"`).
Narrower than System Status — Health knows nothing about the database.
_Avoid_: Status, ping, heartbeat

**Check System**:
The single action the Lab 1 page offers. One button, one question — "is
TokTickIT working?" — answered by System Status plus the Categories. Lab 2 moves
it off the front door to `/system`, where it stays as a diagnostic.
_Avoid_: Refresh, load, test connection

### Process

**Lab**:
One graded unit of work delivering one vertical slice. Lab 1 proved React →
Express → Prisma → PostgreSQL end to end; Lab 2 built the Requester-facing
ticketing MVP; Lab 3 delivers real authentication, role-based authorization,
IT Staff ticketing workflows, and Administrator user management.
_Avoid_: Sprint, milestone, phase

**Issue**:
A numbered unit of work inside a Lab, owning exactly one feature branch and
carrying its own acceptance criteria. Numbering runs continuously across Labs —
Lab 1 held Issues 1–4, Lab 2 held Issues 5–13, Lab 3 holds Issues 14–21 — and is
independent of GitHub's own issue/PR sequence.
_Avoid_: Task, story, ticket — **Ticket** especially, which is now a real
product concept above; an Issue is work the team does, a Ticket is work a
Requester asks for

**Contract**:
The specification plus the evidence required to prove it satisfied. An Issue is
done when its acceptance criteria are checked against running code. The contract
spans four companion documents — `specification.md`, `api-spec.md`,
`ui-spec.md`, `tests.md` — which together are one contract.
_Avoid_: Spec, requirements

**Integration branch**:
A branch that only ever advances through a peer-reviewed PR — `lab3-staging`
and `main`. Feature branches merge into `lab3-staging`; `lab3-staging` merges
into `main`.
_Avoid_: dev, develop, trunk
