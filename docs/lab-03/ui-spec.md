# Lab 3 UI Specification — Zen Green

Authoritative for visual design tokens, component architecture, screen layouts,
states, responsive adaptation, and accessibility. Business rules are defined in
[`specification.md`](./specification.md); endpoint payloads are defined in
[`api-spec.md`](./api-spec.md).

Lab 3 preserves and extends the **Zen Green** design language established in Lab 2.
No secondary visual framework is permitted; Bootstrap 5 utilities and custom CSS
properties in `client/src/styles/theme.css` carry all styling.

---

## 1. Colour Tokens

Color tokens are declared in `client/src/styles/theme.css` on `:root` and override
Bootstrap's native theme properties. No hex codes appear outside `theme.css`.

| Token | Value | Semantic Use |
| --- | --- | --- |
| `--zen-primary` | `#006B3C` | App header bar, primary action buttons, brand identity |
| `--zen-secondary` | `#0B7A46` | Active navigation indicators, focus rings, interactive hover |
| `--zen-pale` | `#EAF6EF` | Selected table rows, subtle cards, badge backgrounds |
| `--zen-page-bg` | `#F5F7F6` | Global page backdrop |
| `--zen-surface` | `#FFFFFF` | Form containers, modal dialogs, data table cards |
| `--zen-border` | `#DDE5E0` | Card borders, table grid lines, input outlines |
| `--zen-text` | `#1C2B24` | Primary typography (deep charcoal-green, never pure black) |
| `--zen-text-muted` | `#5A6B62` | Subtitles, helper text, timestamps, table column headers |
| `--zen-readonly-bg` | `#F2F4F1` | Background fill for immutable/read-only input controls |
| `--zen-danger` | `#B02A2A` | Form validation errors, destructive actions, deactivation badge |
| `--zen-danger-bg` | `#FDF2F2` | Inactive status badge surface, error alert backgrounds |
| `--zen-warning` | `#B8860B` | Critical/High priority badges, pending state warnings |
| `--zen-warning-bg` | `#FFFBEB` | Internal notes container callout, private note surfaces |
| `--zen-info` | `#1E40AF` | IT Staff role badges, open status badges |
| `--zen-info-bg` | `#EFF6FF` | IT Staff badge backdrop |
| `--zen-admin` | `#6B21A8` | Administrator role badge text |
| `--zen-admin-bg` | `#F3E8FF` | Administrator role badge backdrop |

---

## 2. Typography, Spacing, and Global Layout

- **Font Family**: System native font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
- **Type Scale**:
  - Page Headings (`h1`, `.zen-page-title`): `1.75rem / 600`
  - Section Titles (`h2`, `.zen-section-title`): `1.25rem / 600`
  - Body Text: `1rem / 400`
  - Labels & Column Headers: `0.875rem / 600`
  - Captions, Meta, & Validation Messages: `0.8125rem / 400`
- **Spacing Rhythm**: 0.25rem grid scale. 1.5rem (24px) gutters on desktop, 1rem (16px) on mobile.
- **Maximum Container Width**: Standard 1200px centered page content with responsive padding.

---

## 3. Reusable Components

### FormField and Validation

- Labels sit strictly **above** the associated input with `0.375rem` bottom margin.
- Required fields render a red asterisk `*` within `<label>` (`aria-hidden="true"`).
- Read-only fields use `--zen-readonly-bg`, an explicit `readOnly` attribute, `tabIndex={-1}`, and are visually distinct from editable controls.
- Validation errors display **immediately beneath the field** in `--zen-danger` with a small error icon and are linked via `aria-describedby`.

### Badges

#### Role Badges

- `REQUESTER`: `--zen-pale` surface, `--zen-primary` text (`Requester`).
- `IT_STAFF`: `--zen-info-bg` surface, `--zen-info` text (`IT Staff`).
- `ADMINISTRATOR`: `--zen-admin-bg` surface, `--zen-admin` text (`Administrator`).

#### Status Badges

- `NEW`: Surface `--zen-pale`, text `--zen-primary` ("New").
- `OPEN`: Surface `--zen-info-bg`, text `--zen-info` ("Open").
- `IN_PROGRESS`: Surface `#ECFDF5`, text `#065F46` ("In Progress").
- `WAITING_FOR_REQUESTER`: Surface `#FFFBEB`, text `#92400E` ("Waiting for Requester").
- `RESOLVED`: Surface `#F0FDF4`, text `#166534` ("Resolved").
- `CLOSED`: Surface `#F3F4F6`, text `#4B5563` ("Closed").
- `REOPENED`: Surface `#FEF3C7`, text `#B45309` ("Reopened").
- `CANCELLED`: Surface `#FEE2E2`, text `#991B1B` ("Cancelled").

#### Priority Badges

- `LOW`: Soft green badge ("Low").
- `MEDIUM`: Soft amber/orange badge ("Medium").
- `HIGH`: Soft rose/red badge ("High").
- `CRITICAL`: Deep red solid badge with white text ("Critical").

#### Account Status Badges

- `Active`: Soft green badge ("Active").
- `Inactive`: Soft red badge ("Inactive").

### StateBlock

Universal empty, loading, no-results, and error presentation:

- `loading`: Centered spinner with "Loading data..." label.
- `empty`: Friendly explanation with an optional call-to-action button.
- `no-results`: Informs user that search/filters returned no matches, with a "Clear Filters" button.
- `error`: Explains failure with a "Try Again" retry action.

---

## 4. Screen Specifications

### 4.1. Login Screen (`/login`)

- Centered card layout (max-width: 440px) on `--zen-page-bg`.
- TokTickIT green clock logo and brand header.
- Email input (`type="email"`, autofocus).
- Password input with toggle visibility eye icon button.
- Inline alert for authentication failures ("Invalid email or password" or "Account is deactivated").
- Primary button: "Sign In" with in-flight spinner.

### 4.2. Mandatory Change Password Screen (`/change-password`)

- Centered card (max-width: 480px) with prominent instruction: "You must change your password to continue."
- Current (temporary) password input.
- New password input with live checklist feedback:
  - At least 8 characters.
  - Contains uppercase and lowercase letters.
  - Contains at least one number and one special character.
- Confirm new password input with real-time match confirmation.
- Primary action: "Continue" / "Save New Password".

### 4.3. Authenticated App Shell & Header

- Full-width Zen Green navigation bar (`--zen-primary`).
- Left: TokTickIT logo + wordmark.
- Center/Nav: Role-specific navigation tabs:
  - `REQUESTER`: **My Tickets**, **Create Ticket**.
  - `IT_STAFF`: **Ticket Queue**.
  - `ADMINISTRATOR`: **Users**.
- Right: User initial badge avatar, User full name, Role badge, and Profile dropdown containing **Logout**.

### 4.4. IT Staff Ticket Queue (`/staff/queue`)

- Top toolbar:
  - Search bar: "Search by ticket number or summary...".
  - Filter drawer toggle button ("Filters") with badge showing active filter count.
- Filter drawer / accordion:
  - Category dropdown.
  - Current Status multi-select / dropdown.
  - IT Priority dropdown.
  - Owner filter: "All", "Unassigned", "Assigned to Me", or specific staff.
- Data table (Desktop ≥ 992px):
  - Columns: Ticket No., Created Date, Summary, Category, Req. Priority, IT Priority, Status, Owner.
  - Clickable row / "View" action navigating to `/staff/tickets/:id`.
  - Column header sorting indicators (`asc` / `desc`).
- Mobile Queue Card View (< 768px):
  - Card per ticket showing Ticket No, Summary, Status and Priority badges, and assigned owner.
- Pagination bar: Page indicators, Previous, Next, page size selector (10, 20, 50).

### 4.5. IT Staff Ticket Detail (`/staff/tickets/:id`)

- Breadcrumb header: `My Queue > Ticket Detail` with `← Back to Queue` button.
- Ticket Header: Ticket Number, creation timestamp, and Requester identification.
- Operational Attributes Grid:
  - **Ticket Owner**: Dropdown of active IT staff members with a quick "Claim" button if unassigned.
  - **IT Priority**: Editable dropdown (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with save feedback.
  - **Current Status**: Dropdown showing permitted status transitions according to BR-22.
  - **Requested Priority**: Read-only badge.
  - **Category** & **Related System**: Read-only display.
- Requester Details Card:
  - Summary (read-only input).
  - Description (read-only formatted text area).
  - Resolution Indication banner: Displays when `resolvedByRequester === true` ("Requester has indicated this problem appears resolved.").
- Tabbed Content Panel:
  1. **Public Comments Tab**:
     - Chronological feed of public comments.
     - Author avatar, name, role badge, timestamp.
     - "Add Public Comment" form with character counter and "Post Comment" button.
  2. **Internal Notes Tab**:
     - Distinct amber visual callout banner: "🔒 Private IT Staff Notes — Strictly invisible to Requesters".
     - Chronological feed with amber-tinted cards.
     - "Add Internal Note" form with "Save Internal Note" button.
  3. **Attachments Tab**:
     - List of uploaded files with download link, file size, upload author, and status.

### 4.6. Requester Ticket Detail Updates (`/tickets/:id`)

- Lab 2 Requester detail view continues to show read-only ticket details and attachments.
- Added Section: **Public Comments** tab/thread matching the staff public feed.
- Added Action: **"Problem Appears Resolved"** button.
  - When clicked, prompts a confirmation dialog.
  - When confirmed, displays an alert: "You indicated this problem appears resolved. IT Staff will review and formally close the ticket."
  - Button disables once flagged.

### 4.7. Administrator User Management (`/admin/users`)

- Layout: Responsive master-detail table with a slide-in Drawer / Modal for user creation and editing.
- Top Bar:
  - Search bar: "Search users by name or email...".
  - Role filter dropdown: All Roles, Requester, IT Staff, Administrator.
  - Primary button: `+ Create User` (opens creation drawer).
- User Table:
  - Columns: Full Name, Email Address, Role (colored badge), Status (Active/Inactive badge), Actions (`Edit`).
- Create / Edit User Drawer (Panel):
  - `Full Name` input (required).
  - `Email Address` input (required).
  - `Role` dropdown (`Requester`, `IT Staff`, `Administrator`).
  - `Active` toggle switch (green when active, red when inactive).
  - Initial Password section:
    - On Create: Initial password input field with default or custom entry.
    - On Edit: "Reset Initial Password" action button allowing an admin to assign a new temporary password.
  - Action Buttons:
    - "Save User" (primary green).
    - "Deactivate User" / "Activate User" (destructive outline).
    - "Cancel" button.
  - Safety Guards:
    - If user is the currently logged-in Admin: Deactivate toggle is disabled with tooltip "You cannot deactivate your own account."
    - If user is the sole active Administrator: Deactivate toggle and role dropdown are disabled with tooltip "Cannot deactivate or reassign the last active Administrator."

---

## 5. Responsive Breakpoints and Rules

| Viewport | Range | Layout Behavior |
| --- | --- | --- |
| **Desktop** | ≥ 992px | Multi-column grids, full tables, fixed side drawer for admin user management. |
| **Tablet** | 768px – 991px | 2-column forms, condensed tables (secondary columns hidden or truncated), modal overlay drawer. |
| **Mobile** | < 768px (tested at 390px) | Single-column stacked layout, ticket queue transforms to card list, bottom-sheet / full-screen drawer, full-width buttons. |

---

## 6. Accessibility and Usability Standards (WCAG 2.1 AA)

- **Color Contrast**: All text elements achieve a minimum 4.5:1 contrast ratio against their background. Status badges pair color with explicit text.
- **Keyboard Navigation**:
  - Full tab order across all interactive elements.
  - Form submission triggered on `Enter`.
  - Drawers and modals trap focus while open and restore focus on `Escape`.
- **Focus Rings**: Never suppressed; outline uses `--zen-secondary` (`2px solid var(--zen-secondary)` with `2px offset`).
- **Screen Reader Support**: ARIA attributes used appropriately (`aria-invalid`, `aria-describedby`, `aria-expanded`, `aria-modal="true"`, `role="dialog"`).
- **Touch Targets**: All mobile buttons and interactive inputs provide at least 44×44 px touchable surface.
