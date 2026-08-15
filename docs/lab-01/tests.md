# Lab 1 test register

One row per test file. A new test lands with its row here in the same commit.
IDs match the contract's test matrix; `API-00` is an addition, noted below.

| ID       | Path                                        | Tool                | Proves                                                              |
| -------- | ------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| `UI-01`  | `client/tests/lab-01/UI-01-heading.test.tsx` | Vitest              | The TokTickIT heading renders, and [Check System] is enabled |
| `API-00` | `server/tests/lab-01/API-00-app.test.ts`     | Supertest + Vitest  | The Express app mounts under Supertest and answers 404 on an unknown path |
| `API-01` | `server/tests/lab-01/API-01-health.test.ts`  | Supertest + Vitest  | `GET /api/health` returns 200 with `status: "ok"` and `service: "TokTickIT API"` |
| `UI-02`  | `client/tests/lab-01/UI-02-health-status.test.tsx` | Vitest        | [Check System] renders System Status: Online on success, and System Status: Offline plus a useful message when the backend is unreachable |

## Running them

```bash
pnpm test                  # both suites
pnpm --filter client test  # Vitest only
pnpm --filter server test  # Supertest only
```

## Notes

- **`API-00` is not in the contract's matrix.** Issue 1 must prove "Vitest and
  Supertest run from package scripts", but the first contracted server test,
  `API-01`, belongs to Issue 2 along with the `/api/health` route it exercises.
  `API-00` proves the harness without pre-empting that Issue. The matrix is a
  minimum, so this is an addition rather than a substitution.
- **`UI-02` here is not the contract's `UI-02`.** The contract's `UI-02`/`UI-03`
  rows describe Issue 4's category-list behavior (loading→list, error message)
  and aren't in the matrix's numbering yet at Issue 2. This `UI-02` proves
  Issue 2's own acceptance criteria — the React page shows System Status from
  a real `GET /api/health` call, success or failure — which the contract
  requires but the matrix doesn't ID. Issue 4 will add its two UI tests as
  `UI-03`/`UI-04`.
- **Still to come:** `API-02`, `UI-03`, `UI-04` (all Issue 4).
