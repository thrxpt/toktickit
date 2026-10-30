// Cleanup script for Lab 4 E2E test residue.
// Removes transactional records (tickets, attachments, comments, notes) and throwaway
// accounts created by Playwright E2E specs, restoring the database to pristine seed state.
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { demoTicketNumbers, seedReferenceData } from "./seed-data";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exitCode = 1;
    return;
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Locate all tickets created during E2E journeys
    const e2eTickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { summary: { startsWith: "E2E " } },
          { summary: { startsWith: "E2E-" } },
        ],
      },
      select: { id: true },
    });
    const ticketIds = e2eTickets.map((t) => t.id);

    // 2. Child-first sequential deletion to satisfy FK restrict constraints
    if (ticketIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
      const attachments = await prisma.attachment.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
      const comments = await prisma.comment.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
      const notes = await prisma.internalNote.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
      const tickets = await prisma.ticket.deleteMany({
        where: { id: { in: ticketIds } },
      });
      console.log(
        `Deleted ${tickets.count} E2E tickets (${attachments.count} attachments, ` +
          `${comments.count} comments, ${notes.count} notes)`,
      );
    }

    // 3. Remove any stray comments or notes posted on seeded tickets
    const strayComments = await prisma.comment.deleteMany({
      where: {
        OR: [
          { content: { startsWith: "Public comment posted by IT Staff" } },
          { content: { startsWith: "E2E " } },
        ],
      },
    });
    const strayNotes = await prisma.internalNote.deleteMany({
      where: {
        OR: [
          { content: { startsWith: "Private internal note for IT Staff" } },
          { content: { startsWith: "E2E " } },
        ],
      },
    });
    if (strayComments.count > 0 || strayNotes.count > 0) {
      console.log(
        `Deleted ${strayComments.count} stray comments and ${strayNotes.count} stray internal notes`,
      );
    }

    const temporaryUserFilter = {
      OR: [
        { email: { startsWith: "taylor.reed." } },
        { email: { startsWith: "e2e." } },
        { email: { startsWith: "temp.admin." } },
      ],
    };
    // BR-26: restore demo work logs and remove E2E performers' dependents
    // before deleting the temporary accounts (restrict FK).
    await prisma.actionTaken.deleteMany({
      where: {
        seedKey: null,
        OR: [
          { ticket: { ticketNumber: { in: demoTicketNumbers } } },
          { performedBy: temporaryUserFilter },
        ],
      },
    });

    // 4. Delete throwaway E2E user accounts
    const users = await prisma.user.deleteMany({ where: temporaryUserFilter });
    if (users.count > 0) {
      console.log(`Deleted ${users.count} throwaway E2E test users`);
    }

    // 5. Restore reference accounts and the full Lab 4 demo baseline
    await seedReferenceData(prisma);
    console.log("✓ Database restored to pristine seed state");
  } catch (error) {
    console.error("Failed to cleanup E2E database residue:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
