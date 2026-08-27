import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { resolveTestDatabaseUrl } from "./tests/setup/test-database.mts";

// API tests touch Prisma, which needs DATABASE_URL. Every script that touches
// Prisma loads server/.env via Node's --env-file flag; vitest's CLI doesn't
// forward unknown flags and NODE_OPTIONS blocks --env-file outright, so the
// URL is resolved here instead, before any test file imports app.ts.
//
// It resolves to toktickit_test, never the development database (D-14). Set on
// process.env as well as test.env so the config's own imports — the global
// setup among them — see the same value the workers do.
const serverRoot = fileURLToPath(new URL(".", import.meta.url));
const databaseUrl = resolveTestDatabaseUrl(serverRoot);

process.env["DATABASE_URL"] = databaseUrl;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/setup/global-setup.ts"],
    env: { DATABASE_URL: databaseUrl },
  },
});
