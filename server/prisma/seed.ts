// CLI entry for `pnpm db:seed`. The data and the upserts live in seed-data.ts,
// which the test harness also calls directly to prove idempotency (API-28).
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedReferenceData } from "./seed-data";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set — run: cp server/.env.example server/.env");
    process.exitCode = 1;
    return;
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const counts = await seedReferenceData(prisma);
    console.log(
      `✓ seeded ${counts.categories} categories, ` +
        `${counts.relatedSystems} related systems, ${counts.requesters} requesters`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
