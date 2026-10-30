// The reference data and user accounts, and the function that puts them in a database.
//
// Idempotent by upserting on natural keys — Category.name, RelatedSystem.name,
// User.email — never on ids (BR-36, BR-44). Re-running converges: a row edited
// by hand goes back to what is written here rather than being duplicated.
//
// Lab 4 also seeds demo Tickets and Actions Taken by stable keys (BR-26).
// Ordinary Tickets, Comments, Notes and Attachments remain untouched.
import bcrypt from "bcrypt";

import type { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/client";

// Known bcrypt hash for 'Password123!' with salt work factor 10 (BR-06, ADR-0007).
export const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("Password123!", 10);

export const categories: { name: string; isActive: boolean }[] = [
  { name: "Account and Access", isActive: true },
  { name: "Hardware", isActive: true },
  { name: "Software", isActive: true },
  { name: "Network", isActive: true },
  { name: "Telephony", isActive: false },
];

export const relatedSystems: { name: string; isActive: boolean }[] = [
  { name: "Email", isActive: true },
  { name: "Campus Wi-Fi", isActive: true },
  { name: "VPN", isActive: true },
  { name: "LEB2 App", isActive: true },
  { name: "Printer", isActive: true },
  { name: "Corporate Laptop", isActive: true },
  { name: "Legacy Student Portal", isActive: false },
];

export interface SeedUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

export const users: SeedUser[] = [
  // Requesters (specification.md §7)
  // The four active requesters matching Lab 2 expectations:
  {
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.ac.th",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.REQUESTER,
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "Somchai Prasert",
    email: "somchai.prasert@example.ac.th",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.REQUESTER,
    isActive: true,
    mustChangePassword: true, // Seeded with mustChangePassword: true for testing (specification.md §7)
  },
  {
    name: "Marcus Chen",
    email: "marcus.chen@example.ac.th",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.REQUESTER,
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "Priya Raman",
    email: "priya.raman@example.ac.th",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.REQUESTER,
    isActive: true,
    mustChangePassword: false,
  },
  // Inactive requesters
  {
    name: "Daniel Okafor",
    email: "daniel.okafor@example.ac.th",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.REQUESTER,
    isActive: false,
    mustChangePassword: false,
  },
  {
    name: "Retired Staff",
    email: "retired.staff@example.ac.th",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.REQUESTER,
    isActive: false,
    mustChangePassword: false,
  },

  // IT Staff (specification.md §7: 3 active, 1 inactive)
  {
    name: "Michael Brown",
    email: "michael.brown@toktickit.com",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.IT_STAFF,
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@toktickit.com",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.IT_STAFF,
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "David Lee",
    email: "david.lee@toktickit.com",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.IT_STAFF,
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "Former Agent",
    email: "former.agent@toktickit.com",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.IT_STAFF,
    isActive: false,
    mustChangePassword: false,
  },

  // Administrator (specification.md §7: 1 active)
  {
    name: "Administrator",
    email: "admin@toktickit.com",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: Role.ADMINISTRATOR,
    isActive: true,
    mustChangePassword: false,
  },
];

export const requesters = users.filter((u) => u.role === Role.REQUESTER);

export type SeedCounts = {
  categories: number;
  relatedSystems: number;
  requesters: number;
  users: number;
};

export async function seedReferenceData(
  prisma: PrismaClient,
): Promise<SeedCounts> {
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

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
    });
  }

  await seedDemoTickets(prisma);

  return {
    categories: categories.length,
    relatedSystems: relatedSystems.length,
    requesters: requesters.length,
    users: users.length,
  };
}

// BR-26: descriptions are deliberately repeated; only seedKey identifies an action.
async function seedDemoTickets(prisma: PrismaClient): Promise<void> {
  const requester = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@example.ac.th" } });
  const staff = await prisma.user.findMany({ where: { email: { in: ["michael.brown@toktickit.com", "sarah.johnson@toktickit.com"] } }, orderBy: { email: "asc" } });
  const category = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const system = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Corporate Laptop" } });
  const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
  for (const [index, status] of statuses.entries()) {
    const data = {
      requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id,
      ticketOwnerId: index === 0 ? null : staff[index % staff.length].id,
      summary: `Demo: laptop support (${status})`, description: "Lab 4 demo Ticket for shared service desk work.",
      requestedPriority: "MEDIUM" as const, itPriority: priorities[index % priorities.length], status,
      resolvedByRequester: status === "RESOLVED",
    };
    const ticketNumber = `TKT-2026-${String(900001 + index).padStart(6, "0")}`;
    const ticket = await prisma.ticket.upsert({ where: { ticketNumber }, update: data, create: { ticketNumber, ...data } });
    const count = index === 1 ? 1 : index === 2 ? 3 : 0;
    for (let actionIndex = 0; actionIndex < count; actionIndex++) {
      const seedKey = `lab4-action:${status.toLowerCase()}:${actionIndex + 1}`;
      const action = {
        ticketId: ticket.id, performedById: staff[actionIndex % staff.length].id,
        description: "Checked laptop battery", result: actionIndex === 0 ? "Diagnostics completed" : "Battery health confirmed",
        followUpRequired: actionIndex === 0, followUpNote: actionIndex === 0 ? "Monitor battery health" : null,
        attachmentNotes: null,
      };
      await prisma.actionTaken.upsert({ where: { seedKey }, update: action, create: { seedKey, ...action } });
    }
  }
}
