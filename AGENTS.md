# TokTickIT

IT service desk app, built one **vertical slice** per lab. Lab 1 proved the stack end to end: React page → Express REST → Prisma → PostgreSQL. Lab 2 built the Requester-facing ticketing MVP. Lab 3 replaced the temporary Development Requester with real authentication, role-based authorization, the IT Staff Ticket Queue and Ticket Detail workflow, Public Comments and Internal Notes, and Administrator User Management. Lab 4 adds Actions Taken to Tickets, finalizes the Ticket lifecycle, and gives every role a dashboard.

**Contract (Lab 4):** four documents that together are one contract — read before starting an Issue, opening a PR, or calling an Issue done:

| Document | Authoritative for |
| --- | --- |
| [`docs/lab-04/specification.md`](docs/lab-04/specification.md) | Scope, FR-nn, BR-nn, AC-nn, data changes, Definition of Done, decisions |
| [`docs/lab-04/api-spec.md`](docs/lab-04/api-spec.md) | Endpoints, payloads, validation, error envelope, status codes, concurrency |
| [`docs/lab-04/ui-spec.md`](docs/lab-04/ui-spec.md) | Zen Green tokens, components and their states, layout, responsive, a11y |
| [`docs/lab-04/tests.md`](docs/lab-04/tests.md) | Planned tests, AC→test traceability, test commands |

Lab 3's contract stays at [`docs/lab-03/`](docs/lab-03/specification.md), Lab 2's at [`docs/lab-02/specification.md`](docs/lab-02/specification.md), and Lab 1's at [`docs/lab-01/contract.md`](docs/lab-01/contract.md) as the record of what previous labs delivered; they are history, not current scope.

Behavior is cited by number, not by paraphrase — a PR description, a test name, or a code comment says `BR-35` or `AC-30`. If the code and the contract disagree, the contract wins until a PR changes it.

## Stack (locked)

| Layer | Choice |
| --- | --- |
| Frontend | React + TypeScript + Vite + Bootstrap + React Router |
| Backend | Node.js + Express + TypeScript + Multer + Zod |
| Data | PostgreSQL + Prisma |
| API | REST |
| Tests | Vitest (UI) + Supertest (API) + Playwright (E2E) |

Bootstrap classes and components carry all styling; Zen Green is CSS custom properties overriding Bootstrap's own variables in one theme file (`ui-spec.md` §1). A dependency outside this table needs the contract to name it or the user to approve it — that bar covers styling especially, where Tailwind and component kits are the reflex.

## Lab 4 scope

The service desk records the work performed on each Ticket and shows every role what needs attention:

- **Requester**: Sees a dashboard of their own open, waiting, recently updated, and recently resolved Tickets; creates and manages owned Tickets and Attachments; posts Public Comments; reads Actions Taken on owned Tickets read-only; indicates the problem appears resolved.
- **IT Staff**: Uses the IT Staff dashboard (unassigned, owned by me, by status, by IT Priority, recently updated); works the shared Ticket Queue; opens Ticket Detail; claims or reassigns Ticket Owner; sets IT Priority; performs permitted status transitions; records and updates Actions Taken; posts Public Comments and private Internal Notes.
- **Administrator**: Performs the same IT Staff ticket operations for support and testing (ADR-0010), shares the IT Staff dashboard with user-account counts, and retains minimalist User Management. Administrators do not gain IT Staff's role boundaries in reverse: IT Staff still cannot manage users.

Out of scope, and not to be helpfully added: SLA clocks, escalations, notifications, inventory/purchasing, billing/payroll, approval workflows, BI/report builders, multi-tenancy, file uploads on Actions Taken, editing or deleting Actions Taken history, and any feature not named in `docs/lab-04/specification.md`.

**Concurrency**: every mutating Ticket operation carries `expectedVersion` and stale writes answer `409 STALE_UPDATE`; Actions Taken writes are version-guarded in the same way, so repeated submissions cannot create duplicates.

The **Development Requester** selector and `/api/requesters` are fully retired in Lab 4; identity is established server-side through session/cookie authentication. Ownership and role restrictions are strictly enforced server-side.

## Layout

```text
client/
  src/styles/theme.css  Zen Green tokens — the only file with hex values
  tests/lab-01/         UI-*.test.tsx   (Vitest)
  tests/lab-02/         *.test.tsx + style/  (Vitest + Testing Library)
  tests/lab-03/         *.test.tsx  (Vitest + Testing Library)
  tests/lab-04/         *.test.tsx + style/  (Vitest + Testing Library)
server/
  prisma/               schema.prisma, migrations, seed
  src/                  Express app + routes
  scripts/db-check.ts   database reachability probe
  tests/lab-01/         API-*.test.ts   (Supertest)
  tests/lab-02/         *.api.test.ts, *.unit.test.ts
  tests/lab-03/         *.api.test.ts, *.unit.test.ts
  tests/lab-04/         *.api.test.ts, *.unit.test.ts
  tests/setup/          creates, migrates, and seeds `toktickit_test`
  uploads/              attachment bytes, git-ignored (ADR-0004)
e2e/lab-02/             Playwright specs (Lab 2)
e2e/lab-03/             Playwright specs (Lab 3)
e2e/lab-04/             Playwright specs (Lab 4)
artifacts/lab-02/       committed screenshots, generated by Playwright (Lab 2)
artifacts/lab-03/       committed screenshots, generated by Playwright (Lab 3)
artifacts/lab-04/       committed screenshots, generated by Playwright (Lab 4)
docs/lab-02/            Lab 2 contract and records
docs/lab-03/            specification.md, api-spec.md, ui-spec.md, tests.md, reviewer.md, ai-use.md
docs/lab-04/            specification.md, api-spec.md, ui-spec.md, tests.md, reviewer.md, ai-use.md
docs/adr/               architecture decision records
CONTEXT.md              glossary — the project's ubiquitous language
compose.yaml            PostgreSQL 17 for local development
```

The two packages are pnpm workspaces, so `pnpm dev`, `pnpm test`, and
`pnpm build` run from the root and fan out; `pnpm --filter server <script>`
targets one. The client fetches relative `/api/...` URLs through the Vite dev
proxy — there is no CORS middleware, deliberately (`docs/adr/0002`).

`pnpm test` is unit + API + UI + style. Playwright runs separately as `pnpm test:e2e`, so a browser failure can never redden the Definition-of-Done run. API tests use a separate `toktickit_test` database, which the test run creates, migrates, and seeds itself — never the development database. `server/.env.test` overrides its URL when the default (`server/.env`'s credentials, `toktickit_test` as the database name) is wrong.

Lab 1's test filenames carry the contract's IDs (`API-01`, `UI-02`); later labs name tests for the feature under test and carry the ID in the `describe` title. IDs restart per lab and are disambiguated by directory. A new test lands with its row in the current lab's `tests.md` in the same commit.

## Git flow

Each Issue owns one branch, and every commit for that Issue lands on it. Issue numbers run continuously across labs and are independent of GitHub's shared issue/PR sequence:

| Issue | Branch | Depends on |
| ----- | ------ | ---------- |
| 22. Lab 4 contract (docs only) | `feature/22-lab4-contract` | — |
| 23. Stale-update guard: Ticket version and conflict handling | `feature/23-stale-update-guard` | 22 |
| 24. Actions Taken foundation: model, migration, seed, and API | `feature/24-actions-taken-foundation` | 23 |
| 25. Actions Taken UI on Ticket Detail | `feature/25-actions-taken-ui` | 24 |
| 26. Finalize Ticket workflow and resolution gate | `feature/26-ticket-workflow` | 23, 25 |
| 27. Role dashboards (Requester, IT Staff, Administrator) | `feature/27-role-dashboards` | 24 |
| 28. Final regression, accessibility, visual evidence, and release | `feature/28-final-release` | 25, 26, 27 |

GitHub's issue numbers for these tickets are #49–#55 (the shared GitHub sequence is independent, as above); the repo Issue numbers stay continuous and own the branch names.

Issue 22 merges before any implementation PR opens — that ordering is the Spec-DD evidence and cannot be reconstructed afterwards.

Feature branches PR into `lab4-staging`; `lab4-staging` PRs into `main`. Both integration branches move only through a peer-reviewed PR — never a local commit or merge.

## Secrets

`DATABASE_URL` lives in git-ignored `server/.env`. `server/.env.example` carries the key with a placeholder value. `compose.yaml` reads that same file via `env_file`, so the Postgres container and Prisma share one set of credentials. `server/.env.test` overrides the API tests' `toktickit_test` URL and is git-ignored the same way; `server/.env.test.example` is committed beside it.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`thrxpt/toktickit`), driven by the `gh` CLI. See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

The five canonical triage roles, each label string equal to its name. See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root, plus the current lab contract under `docs/lab-04/`. See [`docs/agents/domain.md`](docs/agents/domain.md).
