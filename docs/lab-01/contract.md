# Lab 1 engineering contract

The instructor is stakeholder and product owner. A **specification** defines behavior; a **contract** adds the evidence required to prove it complete. Everything below is the contract for Individual Sprint 1 — an Issue is done when every one of its acceptance criteria has been checked against running code, not against the diff.

## Working result

Opening the frontend shows the app name and a **[Check System]** button. Clicking it:

```text
TokTickIT   IT Service Desk

[Check System]

System Status: Online

Supported Request Categories:
1. Account and Access
2. Hardware
3. Software
4. Network
```

- Status reads `Online` from a real `GET /api/health` call — never a constant.
- Categories come from PostgreSQL through Prisma via `GET /api/categories` — never a hard-coded array.
- A loading state shows while either request is in flight.
- When the API or database is down: `System Status: Offline` plus a message naming what failed, e.g. `Unable to connect to TokTickIT API`.

## Issues

Order: Issue 1 first; 2 and 3 then run in either order; 4 starts once 3 is merged to `lab1-staging`.

### Issue 1 — Project foundation (`feature/1-project-foundation`)

- React + TypeScript + Vite frontend starts.
- Bootstrap is installed and visibly applied.
- Node.js + Express + TypeScript backend starts.
- PostgreSQL is reachable and Prisma is initialized.
- Vitest and Supertest run from package scripts.
- `.gitignore` and `.env.example` exist; secrets and `node_modules` stay out of git.
- README carries setup instructions that work from a clean clone.

### Issue 2 — API health check (`feature/2-health-check`)

- `GET /api/health` returns 200 with `status = ok` and `service = TokTickIT API`.
- `API-01` (Supertest) verifies status code and both fields.
- The React page shows backend status from that call.
- A useful message appears when the backend is unreachable.

### Issue 3 — Category seed (`feature/3-category-seed`)

- Prisma `Category` model with `id`, unique `name`, `createdAt`.
- A migration creates the `Category` table.
- The seed inserts Account and Access, Hardware, Software, Network.
- The seed is idempotent — reruns leave four rows, so upsert on `name`.
- Credentials stay in `server/.env`.

### Issue 4 — Category list (`feature/4-category-list`)

- `GET /api/categories` reads through Prisma with `orderBy: { id: 'asc' }`, giving the predictable order.
- Each element carries `id` and `name`.
- `API-02` (Supertest) verifies the four seeded categories.
- React renders the API's categories.
- Loading and error states render.
- `UI-02` / `UI-03` (Vitest) verify that UI behavior.

## Data model

```prisma
model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
}
```

## Endpoints

```http
GET /api/health   →  200  { "status": "ok", "service": "TokTickIT API" }

GET /api/categories → 200
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

## Test matrix

Minimum set; each row is a file under `server/tests/lab-01/` or `client/tests/lab-01/` and a row in `tests.md`.

| ID       | Tool      | Proves                                              |
| -------- | --------- | --------------------------------------------------- |
| `API-01` | Supertest | Health returns 200 and the expected JSON            |
| `API-02` | Supertest | Categories returns the four seeded categories       |
| `UI-01`  | Vitest    | TokTickIT heading renders                           |
| `UI-02`  | Vitest    | Loading state resolves into the category list       |
| `UI-03`  | Vitest    | API failure renders a useful error message          |

## Kanban states

Board **TokTickIT Individual Sprints**, columns in this order:

`Backlog` → `Specified` → `Started` → `PR Review` → `Fixing` | `Done`

| State       | Meaning                                                           |
| ----------- | ----------------------------------------------------------------- |
| `Backlog`   | Issue exists, not yet read and understood                         |
| `Specified` | Understood, ready to implement                                    |
| `Started`   | Feature branch cut, implementation underway — only one Issue here |
| `PR Review` | PR into `lab1-staging` open, peer reviewer looking                 |
| `Fixing`    | Review changes or failing tests, corrected on the same branch     |
| `Done`      | Approved, tests pass, merged to `lab1-staging`, all AC satisfied  |

`Fixing` returns to `PR Review`; a passing review goes to `Done`.

## Evidence artifacts

Graded from a single PDF, so these three files carry the record and stay current as work lands:

- `tests.md` — one row per test file: path, tool, description. All listed tests live under a `tests/lab-01/` folder.
- `reviewer.md` — peer reviewer name, student ID, GitHub username, reviewed PR links.
- `ai_use.md` — LLM used, 6–10 key prompts with a one-line reflection each.

Also submitted: repo / Project / Issue / PR URLs, board screenshots including all four Issues in `Done`, `main` commit history showing feature → staging → main merges, rendered `README.md` and `.gitignore`, passing test output on `main`, and app screenshots of the initial, success, and failure states.

## Ambiguities, resolved

The source contract conflicts with itself in four places. These readings hold unless the instructor says otherwise:

1. **Integration branch is `lab1-staging`.** One table calls it `dev`; the execution steps, workflow summary, and the pushed branches all say `lab1-staging`. Treat `dev` as a stale name for the same branch.
2. **Tests split by package.** The structure sketch puts `tests/lab-01/` under `server/`, but Vitest UI tests need the client's config and jsdom environment. API tests go in `server/tests/lab-01/`, UI tests in `client/tests/lab-01/`; both paths appear in `tests.md`.
3. **"Do not implement any UI yet" scopes only the ticket mockup** shown as illustration for later labs. Lab 1's Check System page is required.
4. **"Predictable order" means ascending `id`**, which also matches seed insertion order.
