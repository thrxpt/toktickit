import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

// Shared singleton so app.ts (and anything Supertest imports it into) opens
// one connection pool rather than one per import.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const basePrisma = new PrismaClient({ adapter });

// Backward-compatibility alias for Lab 2 test suites that read prisma.requester.
// In Lab 3, Requester was evolved into User.
export const prisma = Object.assign(basePrisma, {
  get requester() {
    return basePrisma.user;
  },
}) as PrismaClient & {
  requester: PrismaClient["user"];
};
