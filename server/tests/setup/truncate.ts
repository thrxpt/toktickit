// Reference data is seeded once per run and left alone; transactional data is
// each test file's own. Truncating in `beforeEach` — rather than rolling back
// a transaction — is forced by the seam: Supertest drives the real app over
// HTTP, so the request runs on its own connection and cannot join a
// test-held transaction (tests.md §1).
import { prisma } from "../../src/prisma";

export async function truncateTransactionalData(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Attachment", "Ticket" RESTART IDENTITY CASCADE',
  );
}
