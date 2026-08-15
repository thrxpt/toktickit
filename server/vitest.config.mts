import { defineConfig } from "vitest/config";

// API-02 touches Prisma, which needs DATABASE_URL. Every other script that
// touches Prisma loads server/.env via Node's --env-file flag; vitest's CLI
// doesn't forward unknown flags and NODE_OPTIONS blocks --env-file outright,
// so load it here instead, before any test file imports app.ts. Missing is
// fine here — the same "DATABASE_URL is not set" story other scripts tell
// surfaces from Prisma itself when a DB-touching test runs.
try {
  process.loadEnvFile(".env");
} catch {
  // server/.env doesn't exist yet; see server/.env.example.
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
