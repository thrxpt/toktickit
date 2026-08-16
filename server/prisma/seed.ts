// Seeds the four Request Categories the contract requires. Upserts on
// `name` so reruns stay idempotent — always four rows, never duplicates.
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const categoryNames = ["Account and Access", "Hardware", "Software", "Network"];

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
    for (const name of categoryNames) {
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    console.log(`✓ seeded ${categoryNames.length} categories`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
