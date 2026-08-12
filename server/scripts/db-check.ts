import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

// Issue 1 evidence for "PostgreSQL is reachable and Prisma is initialized":
// a real query through a real Prisma Client, against the running container.
// The schema has no models yet, so SELECT 1 is the whole of it.
// Prisma wraps connection failures in an outer error whose own message is
// blank; the useful part (ECONNREFUSED and friends) sits in the cause chain.
function describeError(error: unknown): string {
  let current: unknown = error;

  while (current instanceof Error && current.cause !== undefined) {
    current = current.cause;
  }

  const cause = current instanceof Error ? current.message.trim() : String(current).trim();
  const outer = error instanceof Error ? error.message.trim() : String(error).trim();

  return cause || outer || "unknown error";
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set — run: cp server/.env.example server/.env");
    process.exitCode = 1;
    return;
  }

  const host = new URL(databaseUrl).host;
  // Prisma 7 connects through a driver adapter rather than a built-in engine.
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✓ database reachable at ${host}`);
  } catch (error) {
    console.error(`✗ database unreachable at ${host}`);
    console.error(describeError(error));
    console.error("Is the container up? Try: docker compose up -d");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
