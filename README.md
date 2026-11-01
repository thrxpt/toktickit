# TokTickIT

An IT service desk built one vertical slice per lab. Lab 4 adds Actions Taken,
final Ticket lifecycle rules, role dashboards, and regression hardening to the
session-authenticated Requester, IT Staff, and Administrator workflows from Labs 1–3.

The current contract is [specification](docs/lab-04/specification.md),
[API](docs/lab-04/api-spec.md), [UI](docs/lab-04/ui-spec.md), and
[tests](docs/lab-04/tests.md). See the [glossary](CONTEXT.md) and
[architecture decisions](docs/adr/).

| Layer | Choice |
| --- | --- |
| Frontend | React + TypeScript + Vite + Bootstrap + React Router |
| Backend | Node.js + Express + TypeScript + Multer + Zod |
| Data | PostgreSQL + Prisma |
| API | REST |
| Tests | Vitest + Supertest + Playwright |

## Setup

Use Node.js 24 LTS, pnpm (the version pinned in `package.json`), and Docker.

```bash
git clone https://github.com/thrxpt/toktickit.git
cd toktickit
corepack enable
pnpm install
cp server/.env.example server/.env
pnpm db:up
pnpm db:check
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open <http://localhost:5173>. Vite proxies relative `/api` requests to Express on
port 3000 ([ADR-0002](docs/adr/0002-vite-proxy-not-cors.md)). Identity comes only
from the session cookie: the Development Requester screen, `/api/requesters`, and
header identity fallback are retired (BR-30).

`server/.env` is ignored by Git and is read by both Compose and the app. Example
credentials work with a **new** Compose volume; an existing database retains its
original credentials. Set the file to match that database. Attachment bytes live
in ignored `server/uploads/`, created automatically at startup; metadata stays in
PostgreSQL ([ADR-0004](docs/adr/0004-filesystem-attachment-storage.md)).

## Migrations and seed

`pnpm db:migrate` runs `prisma migrate deploy` and applies all seven migrations.
Lab 4 adds Ticket versions, Actions Taken, dashboard indexes, and nullable unique
submission keys for retry-safe Ticket/discussion/Attachment creates (FR-19).
Existing rows and zero-action Tickets remain valid (BR-27). Apply migrations before
starting the updated app.

`pnpm db:seed` is idempotent. Stable demo Ticket Numbers `TKT-2026-900001` through
`TKT-2026-900008` cover every status and IT Priority, assigned/unassigned ownership,
and zero/one/three Actions Taken. Jennifer owns these Tickets; Marcus has none.
Re-running restores demo fields and account credentials without duplicating rows
or altering ordinary Tickets (BR-26).

Back up the database **and uploads** before an upgrade. The recovery path is a
pre-upgrade backup and its matching app revision. Reviewed reverse SQL is under
[`server/prisma/rollback/`](server/prisma/rollback/); stop writes and use the matching
app revision before applying it. Actions Taken reversal destroys work-log entries,
so export them first. Submission-key reversal preserves records but removes retry
protection. For a successfully applied migration, restore the backup and matching revision
rather than rewriting migration history. Prisma `migrate resolve --rolled-back`
applies only to a failed migration after its partial changes are cleaned up.
Never use `migrate reset` on data that must survive.

## Verification

`pnpm test` creates, migrates, and seeds `toktickit_test` automatically, using
`server/.env` credentials. It never truncates the development database. Copy
`server/.env.test.example` to `server/.env.test` to use different credentials or a
disposable database with a name ending in `_test`.

```bash
pnpm test                            # unit, API, UI, style across all labs
pnpm build                           # root E2E + package typechecks/builds
pnpm typecheck                       # root Playwright configs and specs
pnpm --filter server exec tsc --noEmit
pnpm exec playwright install chromium
```

On hosts where Node's experimental web storage conflicts with jsdom, run tests
with `NODE_OPTIONS=--no-experimental-webstorage` (the release used Node 24.18.0).

Browser tests run separately and restore the demo seed before/after the run.
**Use a disposable database for the app and cleanup hooks**, and stop existing
servers on ports 3000/5173 first. Do not run API and E2E suites simultaneously
against the same database.

```bash
cp server/.env.test.example server/.env.test   # configure DATABASE_URL, name ending _test
(
  set -a
  . ./server/.env.test
  set +a
  pnpm --filter server test tests/lab-04/status-matrix.unit.test.ts &&
    CI=1 pnpm test:e2e
)
```

| Command | Purpose |
| --- | --- |
| `pnpm test:e2e` | All Lab 2, 3, and 4 Chromium journeys, responsive checks, screenshots |
| `pnpm test:e2e:lab2` / `:lab3` / `:lab4` | Only that lab's E2E directory |
| `pnpm --filter client test <file>` | One UI/style test file |
| `pnpm --filter server test <file>` | One API/unit test file |
| `pnpm db:cleanup-e2e` | Remove E2E records and restore demo seed; use the disposable URL |
| `pnpm db:up` / `pnpm db:down` | Start/stop Compose PostgreSQL |

Screenshots land in `artifacts/lab-02/`, `artifacts/lab-03/`, and
[`artifacts/lab-04/screenshots/`](artifacts/lab-04/screenshots/). The Lab 4 release
matrix captures major screens and editor/conflict states at 1280, 768, and 390 px,
including keyboard focus. [Release evidence](docs/lab-04/release.md) records checks
and outstanding human release gates.

## Demonstration

After migration and seed, log in with these demo accounts. Each uses
`Password123!`; the seed restores this baseline. Somchai's first login requires a
password change; inactive Daniel cannot sign in.

| Role | Email |
| --- | --- |
| Requester (populated) | `jennifer.anderson@example.ac.th` |
| Requester (empty) | `marcus.chen@example.ac.th` |
| IT Staff | `michael.brown@toktickit.com` |
| Administrator | `admin@toktickit.com` |
| First password change | `somchai.prasert@example.ac.th` |

1. As Jennifer, open Dashboard, follow Open Tickets, and create a Ticket with a PDF
   or image. Open its Detail, post a Public Comment, and indicate Problem Appears
   Resolved; its status stays unchanged (AC-11).
2. As Michael, follow Unassigned to the Queue, claim the Ticket, set IT Priority,
   and advance its status. Record an Action Taken with Follow-Up Required and its
   note, then edit it. Add an Internal Note; Jennifer cannot read it.
3. Keep Detail open in two sessions. Change a Ticket field in one, then save in the
   other: `409 STALE_UPDATE` keeps the draft and offers Reload ticket (AC-20).
4. Resolve, close, and reopen the Ticket as Staff or Administrator. A cancelled
   Ticket offers no further status transitions (AC-09).
5. As Administrator, inspect operational/account metrics, follow a role count to
   Users, and create/edit an account. IT Staff still cannot manage users (AC-23).
6. As Jennifer, read Actions Taken without write controls. As Marcus, inspect the
   empty dashboard. `/system` retains Lab 1's Check System diagnostic.

## Layout

```text
client/src/             pages, components, auth, API, theme
client/tests/lab-01..04/ UI and style tests
server/src/             Express routes, authorization, domain behavior
server/prisma/          schema, migrations, reverse SQL, seed, E2E cleanup
server/tests/lab-01..04/ API and unit tests
server/tests/setup/     disposable test database harness
e2e/lab-02..04/         Chromium journeys and responsive evidence
artifacts/lab-02..04/   committed screenshots
docs/lab-04/            current contract, test/review/AI/release records
docs/adr/               architecture decisions
CONTEXT.md              domain glossary
compose.yaml            PostgreSQL 17
```

Feature work enters `lab4-staging` through a peer-reviewed PR. Release enters
`main` through a peer-reviewed `lab4-staging` PR. Local verification alone does
not certify either integration branch or replace the human review record.
