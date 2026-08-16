# TokTickIT

An IT service desk app, built one vertical slice per lab. Lab 1 proves the stack
end to end: a React page calls an Express REST API, which reads PostgreSQL
through Prisma.

- **Contract:** [`docs/lab-01/contract.md`](docs/lab-01/contract.md)
- **Glossary:** [`CONTEXT.md`](CONTEXT.md)
- **Decisions:** [`docs/adr/`](docs/adr/)

| Layer    | Choice                                |
| -------- | ------------------------------------- |
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend  | Node.js + Express + TypeScript        |
| Data     | PostgreSQL + Prisma                   |
| API      | REST                                  |
| Tests    | Vitest (UI) + Supertest (API)         |

## Requirements

- **Node.js 20 or newer** (developed on 24)
- **pnpm** — `corepack enable` installs the pinned version from `package.json`
- **Docker** — PostgreSQL runs in a container
  ([why](docs/adr/0001-postgres-via-docker-compose.md))

## Setup from a clean clone

```bash
git clone https://github.com/thrxpt/toktickit.git
cd toktickit

corepack enable                      # provides pnpm
pnpm install                         # installs both packages, generates Prisma Client

cp server/.env.example server/.env   # values work as-is for local development
docker compose up -d                 # starts PostgreSQL on :5432

pnpm db:check                        # -> ✓ database reachable at localhost:5432
pnpm db:migrate                      # applies migrations, creates the Category table
pnpm db:seed                         # seeds the four request categories (idempotent)
pnpm dev                             # client on :5173, API on :3000
```

Open <http://localhost:5173>.

`server/.env` is git-ignored and feeds two readers: `compose.yaml` uses it to
configure the Postgres container, and Prisma and Express read `DATABASE_URL` and
`PORT` from it. One file, so the two can never disagree.

## Commands

Run from the repo root; each fans out to the workspace that owns it.

| Command          | Does                                                    |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | Vite dev server and the Express API, together           |
| `pnpm test`      | Vitest (client) and Supertest-on-Vitest (server)        |
| `pnpm build`     | Type-checks and builds both packages                    |
| `pnpm db:up`     | Starts PostgreSQL (`docker compose up -d`)              |
| `pnpm db:down`   | Stops it                                                |
| `pnpm db:check`  | Runs `SELECT 1` through Prisma and reports reachability |
| `pnpm db:migrate`| Applies pending Prisma migrations (`migrate deploy`)    |
| `pnpm db:seed`   | Upserts the four request categories (idempotent)        |

Per-package commands take a filter, e.g. `pnpm --filter server dev`.

## Layout

```text
client/                 React + Vite
  src/                  App shell (Bootstrap)
  tests/lab-01/         UI-*.test.tsx    (Vitest)
server/
  prisma/               schema.prisma, migrations/, seed.ts
  src/                  app.ts (Express app) + index.ts (listener)
  scripts/db-check.ts   database reachability probe
  tests/lab-01/         API-*.test.ts    (Supertest)
docs/lab-01/            contract.md, tests.md, reviewer.md, ai_use.md
docs/adr/               architecture decision records
compose.yaml            PostgreSQL 17
```

The client fetches relative `/api/...` URLs, which the Vite dev server proxies
to Express — so there is no CORS middleware and no API base URL to configure
([why](docs/adr/0002-vite-proxy-not-cors.md)).

## Lab 1 status

Issue 1 ships the foundation: both apps start, Bootstrap styles the page,
PostgreSQL is reachable through Prisma, and both test runners execute from
package scripts. The `[Check System]` button renders disabled until Issue 2
wires it to `GET /api/health`; the request categories follow in Issues 3 and 4.
