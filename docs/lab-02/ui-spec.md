# Lab 2 UI Specification — Zen Green

Authoritative for visual tokens, component states, layout, responsive behaviour, and
accessibility. Behaviour rules live in [`specification.md`](./specification.md); payloads
live in [`api-spec.md`](./api-spec.md).

Lab 2 establishes the visual system every later Lab reuses. Modest aesthetic improvement
is allowed; inventing a second visual language is not.

## 1. Colour tokens

Defined once in `client/src/styles/theme.css` on `:root`, overriding Bootstrap's own
custom properties (D-12). Nothing else in the codebase writes a hex value.

| Token | Value | Use |
|---|---|---|
| `--zen-primary` | `#006B3C` | App header, primary actions, strong emphasis |
| `--zen-secondary` | `#0B7A46` | Active tabs, focus accents, links, hover states |
| `--zen-pale` | `#EAF6EF` | Selected rows, success surfaces, subtle section emphasis |
| `--zen-page-bg` | `#F5F7F6` | Page background |
| `--zen-surface` | `#FFFFFF` | Cards and panels, with a subtle border and restrained shadow |
| `--zen-border` | `#DDE5E0` | Card and field borders |
| `--zen-text` | `#1C2B24` | Body text — dark charcoal-green, never pure black |
| `--zen-text-muted` | `#5A6B62` | Helper text, metadata, placeholders |
| `--zen-readonly-bg` | `#F2F4F1` | Read-only field shading — distinct but readable |
| `--zen-danger` | `#B02A2A` | Error text and borders |
| `--zen-warning` | `#B8860B` | Warning callouts and badges — never ordinary decoration |
| `--zen-success` | `#006B3C` | Success confirmation |

Bootstrap bindings: `--bs-primary: var(--zen-primary)`, `--bs-body-bg: var(--zen-page-bg)`,
`--bs-body-color: var(--zen-text)`, `--bs-border-color: var(--zen-border)`.

## 2. Typography and spacing

- Font stack: Bootstrap's native stack. No web font is loaded — nothing in the design
  needs one, and a blocking font request would be the page's slowest asset.
- Scale: page title `1.75rem/600`, section heading `1.125rem/600`, body `1rem/400`,
  label `0.875rem/600`, helper and validation text `0.8125rem/400`.
- Spacing uses Bootstrap's 0.25rem scale. Field vertical rhythm is `1rem` between fields,
  `0.375rem` between a label and its control, `0.25rem` between a control and its
  validation message.
- Card padding `1.5rem` desktop, `1rem` mobile. Page gutter `1.5rem`, content
  `max-width: 1200px`, centred.

## 3. Component rules

Implemented once, in the components named in `specification.md` §6. A screen that needs a
labelled input uses `FormField`; it does not hand-assemble one.

### FormField

- Label **above** the control, consistent weight and spacing.
- Required fields carry a red asterisk. The asterisk never replaces the validation
  message — both appear.
- Single-line inputs share one height (`2.5rem`). The multiline Description is taller and
  vertically resizable only within limits that cannot break the layout
  (`resize: vertical; min-height: 8rem; max-height: 24rem`).
- Validation messages render **beneath their own field** in `--zen-danger`, never as a
  single anonymous banner at the top of the form.
- Invalid state: `--zen-danger` border plus the message, plus `aria-invalid="true"` and
  `aria-describedby` pointing at the message.
- Read-only fields use `--zen-readonly-bg` with a normal border and are visibly distinct
  from editable fields at a glance.

### Buttons and SubmitButton

- Every button carries visible text. Icons may accompany text; they never replace it
  where the meaning would be unclear.
- Hierarchy: primary (solid `--zen-primary`), secondary (outline), tertiary (link-styled),
  destructive (outline `--zen-danger`), disabled (reduced contrast, `cursor: not-allowed`,
  not activatable).
- `SubmitButton` shows a spinner plus busy label and is disabled while a request is in
  flight (BR-24). Disabled is enforced in state, not only in CSS.

### Badge

Requested Priority and Current Status. Colour is supporting information only — the label
text is always present (AC-44).

| Value | Presentation |
|---|---|
| `LOW` | Pale green background, dark green text, label "Low" |
| `MEDIUM` | Amber background, dark amber text, label "Medium" |
| `HIGH` | Pale red background, dark red text, label "High" |
| `NEW` | `--zen-pale` background, `--zen-primary` text, label "New" |

### StateBlock

One component, four variants, used by every data-bearing view (FR-15):

| Variant | Content |
|---|---|
| `loading` | Centred spinner plus text; never a bare blank area |
| `empty` | Explains that nothing exists yet, offers the creating action |
| `no-results` | Explains that filters matched nothing, offers **Clear Filters** |
| `error` | Safe message, offers **Retry**; never shows a raw error string |

`empty` and `no-results` are different states with different copy and different actions
(BR-31). Collapsing them into one message is a specification violation, not a shortcut.

### ReferenceSelect

A dropdown backed by an API list, owning its own loading, error, and empty states. It never
renders a stale or hard-coded option list (BR-45), and while loading it is disabled with a
"Loading…" placeholder rather than an empty open dropdown.

### Accessibility (all components)

- Every icon-only control has an accessible name and a tooltip.
- Focus indicators are never removed; the visible ring uses `--zen-secondary`.
- Every control is keyboard reachable in visual order, and every form is submittable
  without a mouse.
- Touch targets are at least 44×44 px at mobile widths.
- Dialogs trap focus, close on `Escape`, and return focus to their trigger.

## 4. Application shell

Zen Green header at `--zen-primary`, full width, containing:

- TokTickIT identity (clock mark plus wordmark), linking to `/tickets`
- Navigation: **My Tickets**, **Create Ticket** — the active page carries a
  `--zen-secondary` underline and `aria-current="page"`
- Right side: Profile menu showing the current Development Requester's name, containing
  **Change Requester**
- A persistent, quiet notice — not a warning colour — stating that the Requester selection
  is a testing mechanism and not authentication (BR-03)

Below the header, a breadcrumb row: `My Tickets > Ticket Details`.

Mobile (<768 px): navigation collapses behind a Bootstrap navbar toggler; the Requester
name stays visible in the collapsed bar, because losing sight of the acting identity is
what makes ownership bugs invisible.

## 5. Screens

### 5.1 Development Requester Selection — `/select-requester`

Centred card on the page background, max-width 560 px.

Contents, in order: person-with-gear mark on a `--zen-pale` circle; heading **Select
Development Requester**; explanatory text — *"Select a Development Requester to test
requester-specific ticket behavior. This is not a login screen. Authentication and
role-based access will be introduced in Lab 3."*; a divider; the **Development Requester**
`ReferenceSelect` marked required; an info callout *"Only active development requesters are
shown."*; a shield callout *"Authentication coming in Lab 3."*; then **Cancel** (secondary)
and **Continue** (primary, disabled until a Requester is chosen).

States: `loading` while the list is fetched; `empty` when no active Requester exists,
naming the seed command rather than showing an empty dropdown (AC-07); `error` with retry
when the API fails (AC-06).

### 5.2 Create Ticket — `/tickets/new`

Single card. Field order and grouping:

1. **System-generated, read-only** — Ticket No. (`Generated on submission`) and Ticket Date
   (`Set on submission`), rendered in the read-only style so it is obvious the Requester
   does not fill them, and Requester (the current Development Requester, read-only).
2. **Classification** — Category and Related System, side by side.
3. **Priority** — Requested Priority, `MEDIUM` preselected (BR-14).
4. **Content** — Summary (full width) and Description (full width, multiline).
5. **Attachments** — `AttachmentUploader` below the main fields.
6. **Actions**, bottom right: **Cancel** (secondary), **Create Ticket** (primary).

Success replaces the form with a success panel stating the generated Ticket Number
prominently, the per-file outcome of every Attachment (BR-41, AC-41), and two actions:
**View Ticket** and **Create Another**.

On API failure, the error state appears above the actions and **every entered value stays
in the form** (BR-25, AC-17).

### 5.3 My Tickets — `/tickets`

Page title **My Tickets** with subtitle *"View and track all of your support requests."*,
and top-right **Clear Filters** (secondary) and **Create Ticket** (primary).

`Toolbar`: search input (placeholder *"Search by ticket number or summary…"*) plus
Category, Requested Priority, and Current Status selects, each defaulting to an
"All …" option.

Desktop table columns: Ticket No. (link, `--zen-secondary`), Created Date, Summary,
Category, Requested Priority, Current Status. Sortable headers — Ticket No., Created Date,
Last Updated — carry a sort indicator and an `aria-sort` value. IT Priority and Ticket
Owner columns from the handout's illustration are deliberately absent (D-03).

Footer row: *"Showing X to Y of N tickets"* on the left, `Pagination` on the right.

States: `loading` (skeleton rows, layout does not jump), `empty` (AC-23), `no-results`
(AC-22), `error` with retry.

### 5.4 Ticket Detail — `/tickets/:id`

Breadcrumb, then **Back to My Tickets** top-right.

Ticket panel, all read-only (AC-29) — no editable control anywhere on this screen:
Ticket No., Ticket Date, Category, Related System, Requester, Requested Priority, Current
Status, Summary, then Description full-width.

Attachment panel, visually separated from the Ticket information:

- **Active** group — filename, type icon, size, uploader, upload time, and **Download**
  (and **Preview** for images). Header shows `Attachments (n of 5)`.
- **Removed** group — visually muted, showing filename, size, remover, removal time, and
  reason, with **no download or preview control** (BR-39). Not hidden: the removal is the
  record.
- `AttachmentUploader` when fewer than five active Attachments exist; when five exist, a
  disabled control explaining the limit rather than a silently missing button.
- Removal opens `ConfirmDialog` carrying a required **Reason for removal** field
  (BR-42, AC-38).

Public Comments, Internal Notes, Service Actions, and Event Log appear in the handout's
illustration and are **not** implemented (specification.md §3).

### 5.5 Check System — `/system`

The Lab 1 page, unchanged in behaviour, rendered inside the shell (D-13).

## 6. Attachment states

| State | Presentation |
|---|---|
| Idle | Drop zone plus **Choose files**, listing permitted types and the 5 MB limit up front |
| Selected, not uploaded | Filename, size, and a remove-from-selection control |
| Uploading | Per-file progress; other controls stay usable |
| Uploaded | Filename with a success mark, moves into the active group |
| Rejected | Row in `--zen-danger` naming the reason — too large, wrong type, or limit reached — with the other files unaffected |
| Removed | Muted row with reason and metadata, no download control |
| Unavailable | Download failed; inline retry, no navigation away |

Rejection is always **per file**: one bad file never discards the others, and never
discards the Ticket (BR-41).

## 7. Responsive rules

| Viewport | Behaviour |
|---|---|
| **≥992 px** | Full table. Create Ticket read-only header row in 4 columns, classification in 2. Content centred, `max-width: 1200px`. Filters in one row. |
| **768–991 px** | Table retained, **Last Updated dropped**. Create Ticket 2 columns; Summary and Description full width. Filters wrap to 2 columns. |
| **<768 px** | Everything stacks. My Tickets renders **one card per Ticket** — Ticket No. and Status badge on the top row, Summary, then Category, Priority, and date — not a horizontally scrolling table (AC-43). Filters collapse behind a **Filters** disclosure. Nav uses the toggler. |
| **All sizes** | No clipped labels, no overlapping messages, no hidden buttons, no truncated attachment names without a title attribute, and **no horizontal page scrolling** (AC-42). |

Wide content that genuinely cannot shrink scrolls inside its own container, never taking
the page with it.

## 8. Visual inspection checklist

Checked against this document and the approved illustrations — not from memory — at 1440,
800, and 375 px, for Create Ticket, My Tickets, and Ticket Detail:

- [ ] Header, primary buttons, and links use the specified tokens; no stray hex values
- [ ] Read-only fields visibly distinct from editable fields
- [ ] Required asterisks present, and validation messages sit beneath their own field
- [ ] Button hierarchy correct; disabled and busy states visually distinct
- [ ] Priority and Status badges consistent across list and detail, text always present
- [ ] Loading, empty, no-results, and error states all reachable and all styled
- [ ] Filters, pagination, and attachment controls usable at every viewport
- [ ] No clipping, no overlap, no unintended horizontal scrolling
- [ ] Focus visible on every interactive element; tab order matches visual order
- [ ] Mobile card layout legible at 375 px

## 9. Screenshot paths

Generated by Playwright into version control (see [`tests.md`](./tests.md) §4):

```text
artifacts/lab-02/screenshots/
├── create-ticket/    desktop.png tablet.png mobile.png
│                     initial.png validation-failure.png submitting.png
│                     success.png api-failure.png invalid-attachment.png
├── my-tickets/       desktop.png tablet.png mobile.png
│                     empty.png no-results.png loading.png error.png
│                     requester-a.png requester-b.png
└── ticket-detail/    desktop.png tablet.png mobile.png
                      attachments-active.png attachments-removed.png
                      removal-confirm.png not-owned.png
```
