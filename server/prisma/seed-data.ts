// The Lab 2 reference data, and the function that puts it in a database.
//
// Idempotent by upserting on natural keys — Category.name, RelatedSystem.name,
// Requester.email — never on ids (BR-44). Re-running converges: a row edited
// by hand goes back to what is written here rather than being duplicated.
//
// Reference data only. Tickets and Attachments are transactional and are never
// seeded, so `pnpm db:seed` leaves a developer's own Tickets untouched.
import type { PrismaClient } from "../src/generated/prisma/client";

// Each table carries one inactive row on purpose. "Active reference data only"
// (BR-05, BR-16, BR-45) is otherwise unfalsifiable — API-26 and API-27 need
// something that ought to be absent. Deactivating a row from a test instead
// was rejected: the harness truncates only Attachment and Ticket, so the
// mutation would leak into every file that ran afterwards.

export const categories: { name: string; isActive: boolean }[] = [
  // The four the IT department uses (CONTEXT.md). Order matters: GET
  // /api/categories sorts by id, and Lab 1's API-02 expects these four.
  { name: "Account and Access", isActive: true },
  { name: "Hardware", isActive: true },
  { name: "Software", isActive: true },
  { name: "Network", isActive: true },
  // Retired. Tickets already filed under it stay valid (BR-16).
  { name: "Telephony", isActive: false },
];

export const relatedSystems: { name: string; isActive: boolean }[] = [
  // The six named in CONTEXT.md, independent of Category (BR-18, D-04).
  { name: "Email", isActive: true },
  { name: "Campus Wi-Fi", isActive: true },
  { name: "VPN", isActive: true },
  { name: "LEB2 App", isActive: true },
  { name: "Printer", isActive: true },
  { name: "Corporate Laptop", isActive: true },
  // Decommissioned.
  { name: "Legacy Student Portal", isActive: false },
];

export const requesters: { name: string; email: string; isActive: boolean }[] = [
  // Jennifer Anderson is api-spec.md's worked example; the rest are campus
  // staff chosen freely.
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.ac.th", isActive: true },
  { name: "Somchai Prasert", email: "somchai.prasert@example.ac.th", isActive: true },
  { name: "Marcus Chen", email: "marcus.chen@example.ac.th", isActive: true },
  { name: "Priya Raman", email: "priya.raman@example.ac.th", isActive: true },
  // A former colleague: gone from the selector (BR-05), but their Tickets
  // still make sense to whoever reads them later.
  { name: "Daniel Okafor", email: "daniel.okafor@example.ac.th", isActive: false },
];

export type SeedCounts = {
  categories: number;
  relatedSystems: number;
  requesters: number;
};

export async function seedReferenceData(prisma: PrismaClient): Promise<SeedCounts> {
  for (const { name, isActive } of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive },
      create: { name, isActive },
    });
  }

  for (const { name, isActive } of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive },
      create: { name, isActive },
    });
  }

  for (const { name, email, isActive } of requesters) {
    await prisma.requester.upsert({
      where: { email },
      update: { name, isActive },
      create: { name, email, isActive },
    });
  }

  return {
    categories: categories.length,
    relatedSystems: relatedSystems.length,
    requesters: requesters.length,
  };
}
