// Decision D-14: API tests never touch the development database. This module
// is the single place that decides which database a test run reaches, and it
// is imported by both vitest.config.mts and the global setup.
import { URL } from "node:url";

const TEST_DATABASE_NAME = "toktickit_test";

function loadEnvFile(path: string): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // Absent file. .env.test is optional; see resolveTestDatabaseUrl.
  }
}

/**
 * The URL API tests run against.
 *
 * `server/.env.test` wins when it exists — that is the documented override,
 * git-ignored like `server/.env` with `.env.test.example` committed beside it.
 * Without it, credentials come from `server/.env` but the database name is
 * replaced with `toktickit_test`, so a clean clone runs `pnpm test` with no
 * manual step and a test run still cannot reach development data.
 */
export function resolveTestDatabaseUrl(serverRoot: string): string {
  loadEnvFile(`${serverRoot}/.env.test`);

  const fromTestEnv = process.env["DATABASE_URL"];
  if (fromTestEnv) {
    return fromTestEnv;
  }

  loadEnvFile(`${serverRoot}/.env`);

  const developmentUrl = process.env["DATABASE_URL"];
  if (!developmentUrl) {
    throw new Error(
      "DATABASE_URL is not set — run: cp server/.env.example server/.env",
    );
  }

  const url = new URL(developmentUrl);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}
