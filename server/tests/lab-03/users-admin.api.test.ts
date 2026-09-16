import { afterAll, describe, expect, it } from "vitest";

import { seedReferenceData } from "../../prisma/seed-data";
import { prisma } from "../../src/prisma";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("API-24 — Database seed idempotency check (BR-36)", () => {
  it("executes seed twice and leaves row counts identical without duplicating rows or throwing errors", async () => {
    // First execution
    const firstCounts = await seedReferenceData(prisma);

    const categoriesCount1 = await prisma.category.count();
    const relatedSystemsCount1 = await prisma.relatedSystem.count();
    const usersCount1 = await prisma.user.count();

    expect(categoriesCount1).toBe(firstCounts.categories);
    expect(relatedSystemsCount1).toBe(firstCounts.relatedSystems);
    expect(usersCount1).toBe(firstCounts.users);

    // Second execution (must succeed without error)
    const secondCounts = await seedReferenceData(prisma);

    const categoriesCount2 = await prisma.category.count();
    const relatedSystemsCount2 = await prisma.relatedSystem.count();
    const usersCount2 = await prisma.user.count();

    expect(secondCounts).toEqual(firstCounts);
    expect(categoriesCount2).toBe(categoriesCount1);
    expect(relatedSystemsCount2).toBe(relatedSystemsCount1);
    expect(usersCount2).toBe(usersCount1);
  });
});
