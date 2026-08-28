// Decision D-14: API tests never touch the development database. This module
// is the single place that decides which database a test run reaches.
//
// It is not only a convenience. The harness runs `migrate deploy`, seeds, and
// truncates Attachment and Ticket before every test — so pointing it at the
// development database would destroy the very data the Definition of Done
// wants screenshots of. Resolution therefore ends in a guard, not a default.

const TEST_DATABASE_NAME = "toktickit_test";
const REQUIRED_SUFFIX = "_test";

function loadEnvFile(path: string): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // Absent file. Both .env.test and .env are optional here; see below.
  }
}

function databaseNameOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

/**
 * The URL API tests run against, in precedence order:
 *
 * 1. `DATABASE_URL` already exported into the environment (CI, direnv, a
 *    shell). `process.loadEnvFile` never overrides an existing variable, so
 *    this wins whether we like it or not — which is exactly why the guard
 *    below exists.
 * 2. `server/.env.test`, git-ignored like `server/.env`, with
 *    `.env.test.example` committed beside it.
 * 3. `server/.env`'s credentials with the database name replaced by
 *    `toktickit_test` — so a clean clone runs `pnpm test` with no manual step.
 *
 * Whatever the source, the database must be named for testing. A URL that
 * would send `TRUNCATE` at `toktickit` fails loudly here instead.
 */
export function resolveTestDatabaseUrl(serverRoot: string): string {
  loadEnvFile(`${serverRoot}/.env.test`);

  const configured = process.env["DATABASE_URL"];
  if (configured) {
    return assertTestDatabase(configured);
  }

  loadEnvFile(`${serverRoot}/.env`);

  const developmentUrl = process.env["DATABASE_URL"];
  if (!developmentUrl) {
    throw new Error("DATABASE_URL is not set — run: cp server/.env.example server/.env");
  }

  const url = new URL(developmentUrl);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}

function assertTestDatabase(url: string): string {
  const name = databaseNameOf(url);

  if (!name.endsWith(REQUIRED_SUFFIX)) {
    throw new Error(
      `Refusing to run tests against the database "${name}": the test run ` +
        `migrates, seeds, and truncates it, so its name must end in ` +
        `"${REQUIRED_SUFFIX}" (D-14). Unset DATABASE_URL to use ` +
        `${TEST_DATABASE_NAME}, or point server/.env.test at it.`,
    );
  }

  return url;
}
