# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**: one `CONTEXT.md` and one `docs/adr/` at the root.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the project's ubiquitous language.
- **`docs/adr/`** — read the ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Also authoritative in this repo

The current lab's contract sits alongside the glossary and the ADRs, and outranks the code where they disagree:

- `docs/lab-02/specification.md` — scope, FR/BR/AC, data changes, Definition of Done, decisions
- `docs/lab-02/api-spec.md` — endpoints, payloads, validation, error envelope, status codes
- `docs/lab-02/ui-spec.md` — Zen Green tokens, components and states, layout, responsive, a11y
- `docs/lab-02/tests.md` — planned tests, AC→test traceability, test commands

Cite behavior by number, never by paraphrase — an issue body, a PR description, a test name, or a code comment says `BR-35` or `AC-30`. `docs/lab-01/contract.md` is history, not current scope.

## File structure

```
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   │   ├── 0001-postgres-via-docker-compose.md
│   │   └── ...
│   ├── lab-01/          ← history
│   └── lab-02/          ← current contract
├── client/
└── server/
```

If this repo ever splits into genuinely separate contexts, the marker is a root `CONTEXT-MAP.md` pointing at one `CONTEXT.md` per context, with context-scoped ADRs beside each. It does not exist today.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0005 (ownership failure returns 404) — but worth reopening because…_
