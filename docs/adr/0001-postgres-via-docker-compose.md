# PostgreSQL runs in Docker Compose

Lab 1 requires a reachable PostgreSQL instance, and the work is peer-reviewed by
someone who has to run it on their own machine. A committed `compose.yaml`
pinning `postgres:17-alpine` makes the database part of the repository rather
than part of a developer's laptop: `docker compose up -d` produces the same
server, version, and credentials for everyone.

## Considered options

- **Local install (Homebrew, Postgres.app)** — no Docker requirement, but
  nothing about the database is captured in the repo, and setup instructions
  diverge per operating system.
- **Hosted (Neon, Supabase)** — no local install at all, but it needs an account
  and network access, and it puts a live credential into a graded workflow.

## Consequences

Reviewing or running this project requires Docker. Credentials come from the
git-ignored `server/.env` via `env_file`, so the compose file is committed while
the values are not — see `server/.env.example`.
