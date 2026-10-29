# Lab 4 UI Specification — Zen Green

Authoritative for visual design tokens, component architecture, screen layouts,
states, responsive adaptation, and accessibility. Business rules are defined in
[`specification.md`](./specification.md); endpoint payloads are defined in
[`api-spec.md`](./api-spec.md).

Lab 4 preserves the **Zen Green** design language established in Lab 2 and extended
in Lab 3. No secondary visual framework is permitted. Bootstrap 5 utilities plus the
custom properties in `client/src/styles/theme.css` carry all styling; no hex value
appears outside that file (BR-32).

---

## 1. Colour Tokens

Lab 4 introduces **no new tokens**. The existing set (Lab 3 `ui-spec.md` §1) covers
every new surface:

| Purpose | Tokens |
| --- | --- |
| Page backdrop, cards, surfaces | `--zen-page-bg`, `--zen-surface` |
| Brand header, primary actions | `--zen-primary`, `--zen-secondary` |
| Metric-card emphasis, selected rows | `--zen-pale` |
| Borders and dividers | `--zen-border` |
| Primary and muted text | `--zen-text`, `--zen-text-muted` |
| Read-only content (Action Date/Time, Performed by) | `--zen-readonly-bg` |
| Conflict and validation feedback | `--zen-danger`, `--zen-danger-bg` |
| Follow-up / attention emphasis | `--zen-warning`, `--zen-warning-bg` |
| Status and priority badges | `--zen-status-*`, `--zen-badge-*` |

Colour is never the only carrier of meaning: every badge, conflict, and follow-up
indicator pairs its colour with text.

---

## 2. New Reusable Components

### MetricCard

A compact summary card used on every dashboard.

- Surface: `--zen-surface` with a `--zen-border` border and 1.5 rem padding.
- Contents, in order: a caption label in `--zen-text-muted` (0.875 rem / 600), a
  value in `--zen-text` (2 rem / 700), and an optional drill-down link.
- The value is real text, not an image or icon, so screen readers announce it.
- When the whole card is a link, the card carries a descriptive accessible name
  ("Open Tickets, 3, view list"); nested interactive elements are avoided.
- Zero value is rendered normally (`0`), never hidden and never replaced by a dash.
- Loading state: a skeleton block of identical size with `aria-busy="true"`, so the
  grid does not jump.
- Error state: the card frame remains, showing "Unavailable" plus a Retry link for
  that metric.

### DashboardList

The "recent" list used by Requester and Staff dashboards.

- Rows show Ticket Number, Summary (truncated with a title attribute), status badge,
  IT Priority badge, and relative timestamp.
- The whole row links to Ticket Detail (Requester: `/tickets/:id`; Staff/Admin:
  `/staff/tickets/:id`).
- Empty state: a short sentence inside the card ("No Tickets yet. Create one when
  something needs IT." for Requesters; "Nothing has changed recently." for staff).
- At most five rows are rendered, matching the API list length (BR-22).

### ConflictAlert

Shown when a mutation answers `409 STALE_UPDATE` (AC-20).

- `role="alert"`, danger background (`--zen-danger-bg`), text: "Someone else updated
  this Ticket while you were editing. Your text has been kept. Reload to see the
  latest version before saving again."
- Primary action: **Reload ticket** (re-fetches the Ticket). Secondary: dismiss.
- The form's entered values are **not** cleared by the conflict (FR-20).
- Reloading replaces server-derived values but preserves the user's unsaved text in
  the editor until they choose to discard.

### ActionsTakenPanel

The Ticket Detail work log.

- Table (desktop): columns **Action Date/Time**, **Description**, **Result**,
  **Performed by**, **Follow-Up**, **Attachment Notes**, **Actions**.
- Follow-Up column: "Required" badge in `--zen-warning` plus the note text, or "—".
- Attachment Notes: truncated with a title attribute; full text on expand.
- Actions column: **Edit** button (staff/admin only).
- Mobile (< 768 px): one card per action showing the same fields stacked, with the
  date as the card heading.
- Ordered oldest-first, matching the API (BR-07).

### ActionEditor

Create and edit mode share one form.

- Fields: Description (textarea, required, counter 0/2,000), Result (textarea,
  required, counter), Follow-Up Required (switch), Follow-up Note (textarea,
  disclosed only when the switch is on, required in that state), Attachment Notes
  (textarea, counter 0/1,000, helper text "Describe the file to look for; this does
  not upload anything.").
- Read-only in edit mode: **Performed by** and **Action Date/Time** rendered with
  `--zen-readonly-bg` and no editable affordance.
- Submit button shows an in-flight spinner and is disabled while the request is in
  flight (FR-19).
- Validation appears beneath each field, linked by `aria-describedby`, matching the
  API messages.
- The form keeps its values after any recoverable failure (network, 409, 500).

---

## 3. Screen Specifications

### 3.1 Authenticated App Shell and Navigation

Role navigation destinations (FR-16, BR-20):

| Role | Navigation |
| --- | --- |
| `REQUESTER` | Dashboard, My Tickets, Create Ticket |
| `IT_STAFF` | Dashboard, Ticket Queue |
| `ADMINISTRATOR` | Dashboard, Ticket Queue, Users |

- Dashboard is the first nav item and the post-login landing destination for every
  role (replacing the previous role-specific landing route).
- The active item uses the existing `zen-nav-link active` treatment plus
  `aria-current="page"`.
- The user name, role badge, avatar initials, and Logout menu are unchanged.
- Remove the Development Requester selector route/link, `RequesterProvider`,
  `RequesterContext`, and `STORAGE_KEY`; the API client no longer injects
  `X-Requester-Id`. `RequireAuth`, `RequireRole`, and the old `RequesterGuard`
  use session identity and the existing login/forbidden flow, with no redirect to
  `/select-requester` (BR-30; retirement inventory in `tests.md` §5).

### 3.2 Dashboard (`/dashboard`)

One route, role-switched content. Page title reflects the role: "My Dashboard",
"Service Desk Dashboard", or "Administration Dashboard".

#### Requester

1. Page heading and a one-line summary ("A quick look at your IT requests.").
2. `MetricCard` grid: **Open Tickets** (count), **Waiting for You** (count), each
   drilling into the filtered My Tickets list.
3. **Recently Updated** `DashboardList` (drill: `/tickets?sort=updatedAt&order=desc`).
4. **Recently Resolved** `DashboardList` (drill: `/tickets?statusGroup=resolved&sort=updatedAt&order=desc`).
5. Empty state (no Tickets at all): the two cards show `0` and both lists show their
   empty copy, plus a **Create Ticket** button.

`MyTickets.tsx` reads `statusGroup`, `sort`, and `order` from the URL and forwards
them to `/api/tickets`; pagination retains the group and sorting. Selecting a
single status clears the group, and selecting a group clears a single status, so
the client does not send conflicting filters. Recent-list drill-downs show the full
matching collection in recent-update order; individual rows still open Ticket
Detail. API-19, UI-11, and E2E-03 verify the destination behavior (AC-15).

#### IT Staff

1. **Unassigned** and **Owned by Me** metric cards (`owner=unassigned`, `owner=me`).
2. **By Status**: eight compact cards or a labelled grid, each drillable to
   `status=<STATUS>`; all eight keys are always shown, including zeros.
3. **By IT Priority**: four compact cards (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with
   the existing priority badge colours, each drillable to `priority=<PRIORITY>`.
4. **Recently Updated** `DashboardList` with owner name and drill to
   `sortBy=updatedAt&sortOrder=desc`.
5. Empty state: cards show `0`, list shows "The queue is empty. Nothing needs IT
   right now."

#### Administrator

- The IT Staff dashboard content, plus a final **Accounts** card group: Total,
  Active, Inactive, and one card per role. Total links to `/admin/users`; the
  per-role cards link to `/admin/users?role=<ROLE>`. Active and Inactive are
  informational (the user list API filters by role, not activation state), so they
  render without a link. If the account metrics fail, only that group shows its
  error state; the ticket metrics
  remain usable.
- A short link "Manage users →" appears in the heading area.
- `client/src/pages/admin/UserManagement.tsx` initializes its filter from the
  `role` URL parameter and applies URL changes during navigation, so the linked
  list fetches `/api/admin/users?role=<ROLE>` and displays the matching accounts.
  The Total link clears the role filter. UI-12 and E2E-03 cover this behavior.

#### Dashboard states

- **Loading**: heading plus skeleton `MetricCard`s and list rows; no layout shift.
- **Forbidden**: if the API answers `403`, render `StateBlock` (error variant) with
  "You do not have access to this dashboard." and no retry loop.
- **Safe failure**: a `500`/network failure renders the error `StateBlock` with
  **Try Again**; partial success is allowed per section (a failed User-counts request
  does not blank the ticket metrics).

### 3.3 Actions Taken on IT Staff Ticket Detail (`/staff/tickets/:id`)

- Add a fourth tab, **Actions Taken**, placed after Attachments (default tab remains
  Attachments).
- Tab header shows the action count, e.g. "Actions Taken (3)".
- Content: `ActionsTakenPanel` with a **Record Action** button above the list. The
  button opens `ActionEditor` inline (or in the existing drawer pattern) in create
  mode.
- Each row's **Edit** opens the same editor in edit mode with Performed by and
  Action Date/Time read-only.
- Successful save: editor closes, list refreshes in server order, and a success
  toast/alert appears. The Ticket's version is updated from the response before the
  next mutation (api-spec §4, rule 4).
- Empty: "No Actions Taken yet. Record the first action to start the work log."
- A Ticket with zero actions is normal, never an error.

### 3.4 Actions Taken on Requester Ticket Detail (`/tickets/:id`)

- A read-only **Actions Taken** section between the resolution indication and the
  Public Comments thread, heading "What IT has done".
- Same fields as the staff table, presented as a vertical list/card stack; no create,
  edit, or delete controls anywhere (FR-18, BR-10).
- Empty: "IT has not recorded any actions yet."
- If the API answers `403`/`404` for actions (should be impossible for an owned
  Ticket), the section renders a quiet unavailable state; the rest of the page
  continues to work.

### 3.5 Workflow Feedback on Ticket Detail

- The **Current Status** dropdown lists only `permittedTransitions` from the
  server payload, plus the current status as the selected, non-selectable option.
- When no transitions are permitted (`CANCELLED` only, which is terminal), the
  control renders as a read-only field with an explanation ("This Ticket is
  cancelled; no further status changes are possible."). A `CLOSED` Ticket still
  offers `REOPENED`.
- On success: the status badge, the dropdown options, and the `version` refresh from
  the response; a success message appears.
- On `409`: `ConflictAlert` with **Reload ticket**; the chosen value is not applied.
- Resolution indication banner (from Lab 3) remains visible and unchanged, worded as
  advisory: "Requester has indicated this problem appears resolved. IT Staff review
  the work and formally close the Ticket."
- The Requester resolution-indication control submits the loaded Ticket's
  `version` as `expectedVersion`. Success updates the local version from
  `ticketVersion`; `409` renders `ConflictAlert` with reload instead of silently
  applying the indication (FR-06, BR-12; UI-09, API-12).

---

## 4. Responsive Breakpoints and Rules

| Viewport | Range | Lab 4 Behavior |
| --- | --- | --- |
| **Desktop** | ≥ 992 px | Metric cards in a 4-column grid; Actions Taken as a full table; dashboard lists beside each other where space allows. |
| **Tablet** | 768–991 px | Metric cards 2 per row; table condenses (Attachment Notes truncated); editor full width. |
| **Mobile** | < 768 px (tested at 390 px) | Metric cards stack 1 per row; Actions Taken becomes cards; editor fields full width; 44 px touch targets; no horizontal page scroll. |

Additional rules:

- Ticket Number and Action Date/Time never wrap mid-token; long summaries truncate
  with a title attribute.
- The dashboard grid uses Bootstrap's responsive grid classes rather than fixed
  widths.
- No modal dialog is used for Actions Taken; inline/drawer editing avoids focus-trap
  complexity on mobile.

---

## 5. Accessibility and Usability Standards (WCAG 2.1 AA)

- Metric cards: each card exposes a heading and its value as text; drill-down links
  have descriptive accessible names ("View Tickets waiting for you").
- Dashboard lists: semantic list/table markup; each row's link text includes the
  Ticket Number.
- Actions Taken table: real `<table>` with `<th scope="col">`; the mobile card
  variant keeps field labels visible as text (not placeholders).
- Forms: labels above fields, required indicators, errors linked with
  `aria-describedby`, and `aria-invalid` on failure.
- Conflict alert uses `role="alert"` and receives focus without stealing it from the
  user's editor.
- Focus remains visible everywhere (`:focus-visible` uses `--zen-secondary`).
- Keyboard: the tab order follows visual order; the Follow-Up switch is operable with
  Space/Enter; drawer/inline editors return focus to the invoking button on close.
- Status, priority, follow-up, and conflict states always pair colour with text.
- No content is conveyed by icon alone.

---

## 6. Visual and Accessibility Checklist (grading evidence)

Rendered in `artifacts/lab-04/screenshots/` at 1280 px, 768 px, and 390 px:

- [ ] Requester Dashboard: populated and empty.
- [ ] IT Staff Dashboard: populated, including all eight status cards and four
      priority cards.
- [ ] Administrator Dashboard: staff metrics plus account counts.
- [ ] Actions Taken: list, create mode, edit mode with read-only Performed by and
      Action Date/Time, Follow-Up Required with note, validation error.
- [ ] Ticket Detail: permitted transitions only; cancelled Ticket read-only state.
- [ ] Conflict alert with preserved form data.
- [ ] Requester Ticket Detail: read-only Actions Taken.
- [ ] No clipped text, overlapping controls, or horizontal page scroll at any width.
- [ ] Focus ring visible on nav, metric cards, and editor controls (captured in at
      least one screenshot per screen).
