# Lab 1 test register

One row per test file. A new test lands with its row here in the same commit.
IDs match the contract's test matrix; `API-00` is an addition, noted below.

| ID       | Path                                        | Tool                | Proves                                                              |
| -------- | ------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| `UI-01`  | `client/tests/lab-01/UI-01-heading.test.tsx` | Vitest              | The TokTickIT heading renders, and [Check System] is disabled until Issue 2 wires it |
| `API-00` | `server/tests/lab-01/API-00-app.test.ts`     | Supertest + Vitest  | The Express app mounts under Supertest and answers 404 on an unknown path |

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
- **Still to come:** `API-01` (Issue 2), `API-02` (Issue 4), `UI-02` and `UI-03`
  (Issue 4).
