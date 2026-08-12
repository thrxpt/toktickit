# TokTickIT

IT service desk app, built one **vertical slice** per lab. Lab 1 proves the stack end to end: React page → Express REST → Prisma → PostgreSQL.

**Contract:** [`docs/lab-01/contract.md`](docs/lab-01/contract.md) — per-Issue acceptance criteria, endpoint payloads, the `Category` model, the test matrix, Kanban states, and resolved ambiguities. Read it before starting an Issue, opening a PR, or calling an Issue done.

## Stack (locked)

| Layer    | Choice                                |
| -------- | ------------------------------------- |
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend  | Node.js + Express + TypeScript        |
| Data     | PostgreSQL + Prisma                   |
| API      | REST                                  |
| Tests    | Vitest (UI) + Supertest (API)         |

Bootstrap classes and components carry all styling. A dependency outside this table needs the contract to name it or the user to approve it — that bar covers styling especially, where Tailwind and component kits are the reflex.

## Lab 1 scope

Ships exactly `GET /api/health`, `GET /api/categories`, and one page whose **[Check System]** button renders loading → status + category list, or an error message. Auth, tickets, uploads, and Playwright land in later labs.

## Layout

```text
client/                 React + Vite
  tests/lab-01/         UI-*.test.tsx   (Vitest)
server/
  prisma/               schema.prisma, migrations, seed
  src/                  Express app + routes
  tests/lab-01/         API-*.test.ts   (Supertest)
docs/lab-01/            contract.md, tests.md, reviewer.md, ai_use.md
```

Test filenames carry the contract's IDs (`API-01`, `UI-02`). A new test lands with its row in `docs/lab-01/tests.md` in the same commit.

## Git flow

Each Issue owns one branch, and every commit for that Issue lands on it:

| Issue                 | Branch                         |
| --------------------- | ------------------------------ |
| 1. Project foundation | `feature/1-project-foundation` |
| 2. API health check   | `feature/2-health-check`       |
| 3. Category seed      | `feature/3-category-seed`      |
| 4. Category list      | `feature/4-category-list`      |

Feature branches PR into `lab1-staging`; `lab1-staging` PRs into `main`. Both integration branches move only through a peer-reviewed PR — never a local commit or merge.

## Secrets

`DATABASE_URL` lives in git-ignored `server/.env`. `server/.env.example` carries the key with a placeholder value.
