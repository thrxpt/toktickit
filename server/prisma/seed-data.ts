// The reference data and user accounts, and the function that puts them in a database.
//
// Idempotent by upserting on natural keys — Category.name, RelatedSystem.name,
// User.email — never on ids (BR-36, BR-44). Re-running converges: a row edited
// by hand goes back to what is written here rather than being duplicated.
//
// Reference data and core users only. Tickets, Comments, Notes, and Attachments
// are transactional and are never seeded, so `pnpm db:seed` leaves transactional
// data untouched.
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

  return {
    categories: categories.length,
    relatedSystems: relatedSystems.length,
    requesters: requesters.length,
    users: users.length,
  };
}
