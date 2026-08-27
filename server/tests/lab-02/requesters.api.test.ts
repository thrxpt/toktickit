import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { seedReferenceData } from "../../prisma/seed-data";
import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

// Reference data is seeded once per run by the global setup and read here over
// HTTP — the same Supertest-against-`app` seam Lab 1 established. Expectations
// are written out rather than imported from the seed, so these tests can
// actually falsify it. Ids are never asserted: every id is autoincrement, so
// its value depends on seed order (api-spec.md's `"id": 3` is illustrative).

const activeRequesters = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.ac.th" },
  { name: "Marcus Chen", email: "marcus.chen@example.ac.th" },
  { name: "Priya Raman", email: "priya.raman@example.ac.th" },
  { name: "Somchai Prasert", email: "somchai.prasert@example.ac.th" },
];

const inactiveRequesterEmail = "daniel.okafor@example.ac.th";
const activeCategoryNames = ["Account and Access", "Hardware", "Software", "Network"];
const inactiveCategoryName = "Telephony";
const activeRelatedSystemNames = [
  "Campus Wi-Fi",
  "Corporate Laptop",
  "Email",
  "LEB2 App",
  "Printer",
  "VPN",
];
const inactiveRelatedSystemName = "Legacy Student Portal";

type NamedRow = { id: number; name: string };

// tests.md §1 makes this every API file's opening move. This file creates no
// Ticket and no Attachment, so it clears nothing today — it is here so that a
// file which does create them cannot inherit another file's rows.
beforeEach(async () => {
  await truncateTransactionalData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("API-26 — GET /api/requesters (AC-01, BR-05)", () => {
  it("returns the four active Requesters, ascending by name", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      activeRequesters.map((requester) => ({ id: expect.any(Number), ...requester })),
    );
  });

  it("never lists an inactive Requester", async () => {
    const response = await request(app).get("/api/requesters");

    const emails = response.body.map((requester: { email: string }) => requester.email);
    expect(emails).not.toContain(inactiveRequesterEmail);
  });
});

describe("API-27 — active reference data only (FR-16, BR-45)", () => {
  it("returns active Related Systems, ascending by name", async () => {
    const response = await request(app).get("/api/related-systems");

    expect(response.status).toBe(200);
    expect(response.body.map((system: NamedRow) => system.name)).toEqual(
      activeRelatedSystemNames,
    );
    for (const system of response.body) {
      expect(system).toEqual({ id: expect.any(Number), name: expect.any(String) });
    }
  });

  it("omits a decommissioned Related System", async () => {
    const response = await request(app).get("/api/related-systems");

    expect(response.body.map((system: NamedRow) => system.name)).not.toContain(
      inactiveRelatedSystemName,
    );
  });

  it("returns active Categories in Lab 1's { id, name } shape", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body.map((category: NamedRow) => category.name)).toEqual(
      expect.arrayContaining(activeCategoryNames),
    );
    expect(response.body).toHaveLength(activeCategoryNames.length);

    const ids = response.body.map((category: NamedRow) => category.id);
    expect(ids).toEqual([...ids].sort((a: number, b: number) => a - b));
    for (const category of response.body) {
      expect(category).toEqual({ id: expect.any(Number), name: expect.any(String) });
    }
  });

  it("omits a retired Category", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.body.map((category: NamedRow) => category.name)).not.toContain(
      inactiveCategoryName,
    );
  });
});

describe("API-28 — the seed is idempotent (BR-44)", () => {
  it("leaves all three reference collections identical when run again", async () => {
    const readAll = async () =>
      Promise.all(
        ["/api/requesters", "/api/related-systems", "/api/categories"].map(
          async (path) => (await request(app).get(path)).body,
        ),
      );

    const before = await readAll();

    await seedReferenceData(prisma);

    expect(await readAll()).toEqual(before);
  });
});
