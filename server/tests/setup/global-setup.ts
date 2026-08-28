// Runs once per `vitest run`, before any test file. It makes the test database
// exist, brings it to the current schema, and seeds reference data — so a
// green suite proves the migration and the seed work, rather than proving
// somebody remembered to run them (tests.md §1).
//
// Which database that is was decided by vitest.config.mts, the one place that
// resolves it (D-14); it arrives here as DATABASE_URL.
import { execFileSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";

const serverRoot = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");

/** The same server, database `postgres` — where CREATE DATABASE is issued. */
function maintenanceUrl(testDatabaseUrl: string): string {
  const url = new URL(testDatabaseUrl);
  url.pathname = "/postgres";
  url.search = "";
  return url.toString();
}

async function ensureDatabaseExists(testDatabaseUrl: string): Promise<void> {
  const name = new URL(testDatabaseUrl).pathname.replace(/^\//, "");
  const adapter = new PrismaPg({ connectionString: maintenanceUrl(testDatabaseUrl) });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.$queryRaw<
      { datname: string }[]
    >`SELECT datname FROM pg_database WHERE datname = ${name}`;

    if (existing.length === 0) {
      // Identifiers cannot be parameterised, and the name comes from a URL we
      // resolved ourselves, never from a test.
      await prisma.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      console.log(`✓ created test database ${name}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

function run(bin: string, args: string[], testDatabaseUrl: string): void {
  execFileSync(`${serverRoot}/node_modules/.bin/${bin}`, args, {
    cwd: serverRoot,
    stdio: "inherit",
    // prisma.config.ts loads server/.env, but process.loadEnvFile leaves an
    // already-set variable alone — so this wins and the child reaches the
    // test database.
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}

export default async function setup(): Promise<void> {
  const testDatabaseUrl = process.env["DATABASE_URL"];

  if (!testDatabaseUrl) {
    throw new Error("DATABASE_URL is not set — see server/.env.test.example");
  }

  await ensureDatabaseExists(testDatabaseUrl);
  run("prisma", ["migrate", "deploy"], testDatabaseUrl);
  run("tsx", ["prisma/seed.ts"], testDatabaseUrl);
}
