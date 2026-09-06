import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(async () => {
  await truncateTransactionalData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function getTestFixtures() {
  const requesters = await prisma.requester.findMany({
    where: { isActive: true },
    orderBy: { email: "asc" },
  });
  const requesterA = requesters[0];
  const requesterB = requesters[1];

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const catHardware =
    categories.find((c) => c.name === "Hardware") ?? categories[0];

  const relatedSystems = await prisma.relatedSystem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const systemLaptop =
    relatedSystems.find((s) => s.name === "Corporate Laptop") ??
    relatedSystems[0];

  return {
    requesterA,
    requesterB,
    catHardware,
    systemLaptop,
  };
}

describe("API-17 — Fetch an owned Ticket (AC-29)", () => {
  it("responds 200 with full detail including empty attachment groups and no storageKey", async () => {
    const { requesterA, catHardware, systemLaptop } = await getTestFixtures();

    const created = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000042",
        requesterId: requesterA.id,
        categoryId: catHardware.id,
        relatedSystemId: systemLaptop.id,
        summary: "Laptop battery drains quickly",
        description:
          "My laptop battery is draining much faster than usual even when idle.",
        requestedPriority: "MEDIUM",
        status: "NEW",
      },
    });

    const response = await request(app)
      .get(`/api/tickets/${created.id}`)
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: created.id,
      ticketNumber: "TKT-2026-000042",
      summary: "Laptop battery drains quickly",
      description:
        "My laptop battery is draining much faster than usual even when idle.",
      requestedPriority: "MEDIUM",
      status: "NEW",
      category: {
        id: catHardware.id,
        name: catHardware.name,
      },
      relatedSystem: {
        id: systemLaptop.id,
        name: systemLaptop.name,
      },
      requester: {
        id: requesterA.id,
        name: requesterA.name,
      },
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      attachments: {
        active: [],
        removed: [],
      },
    });

    // BR-37: storageKey is never exposed anywhere in the response body
    const bodyString = JSON.stringify(response.body);
    expect(bodyString).not.toContain("storageKey");
  });

  it("responds 200 with partitioned active and removed attachments populated", async () => {
    const { requesterA, catHardware, systemLaptop } = await getTestFixtures();

    const created = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000043",
        requesterId: requesterA.id,
        categoryId: catHardware.id,
        relatedSystemId: systemLaptop.id,
        summary: "Laptop keyboard not responding",
        description: "Keyboard keys are stuck and not typing properly.",
        requestedPriority: "HIGH",
        status: "NEW",
      },
    });

    const activeAttachment = await prisma.attachment.create({
      data: {
        ticketId: created.id,
        originalFilename: "keyboard-active.png",
        mimeType: "image/png",
        sizeBytes: 12345,
        storageKey: "active-uuid-key",
        uploadedById: requesterA.id,
      },
    });

    const removedAttachment = await prisma.attachment.create({
      data: {
        ticketId: created.id,
        originalFilename: "keyboard-old.png",
        mimeType: "image/png",
        sizeBytes: 67890,
        storageKey: "removed-uuid-key",
        uploadedById: requesterA.id,
        removedAt: new Date("2026-08-26T10:00:00.000Z"),
        removedById: requesterA.id,
        removalReason: "Uploaded wrong image",
      },
    });

    const response = await request(app)
      .get(`/api/tickets/${created.id}`)
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(200);
    expect(response.body.attachments).toEqual({
      active: [
        {
          id: activeAttachment.id,
          originalFilename: "keyboard-active.png",
          mimeType: "image/png",
          sizeBytes: 12345,
          uploadedBy: {
            id: requesterA.id,
            name: requesterA.name,
          },
          createdAt: activeAttachment.createdAt.toISOString(),
          contentUrl: `/api/attachments/${activeAttachment.id}/content`,
        },
      ],
      removed: [
        {
          id: removedAttachment.id,
          originalFilename: "keyboard-old.png",
          mimeType: "image/png",
          sizeBytes: 67890,
          uploadedBy: {
            id: requesterA.id,
            name: requesterA.name,
          },
          createdAt: removedAttachment.createdAt.toISOString(),
          removedAt: "2026-08-26T10:00:00.000Z",
          removedBy: {
            id: requesterA.id,
            name: requesterA.name,
          },
          removalReason: "Uploaded wrong image",
        },
      ],
    });

    // Verify storageKey is not exposed
    expect(JSON.stringify(response.body)).not.toContain("storageKey");
    expect(JSON.stringify(response.body)).not.toContain("active-uuid-key");
    expect(JSON.stringify(response.body)).not.toContain("removed-uuid-key");
  });
});

describe("API-18 — Fetch another Requester's Ticket (AC-30, BR-08)", () => {
  it("responds 404 with body identical to a nonexistent id and leaks no ticket data", async () => {
    const { requesterA, requesterB, catHardware, systemLaptop } =
      await getTestFixtures();

    const uniqueSummary = "Requester B Confidential Summary 98765";
    const uniqueDescription = "Requester B Confidential Description 12345";

    const ticketB = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000099",
        requesterId: requesterB.id,
        categoryId: catHardware.id,
        relatedSystemId: systemLaptop.id,
        summary: uniqueSummary,
        description: uniqueDescription,
        requestedPriority: "HIGH",
        status: "NEW",
      },
    });

    // Requester A attempts to fetch Requester B's ticket
    const unownedResponse = await request(app)
      .get(`/api/tickets/${ticketB.id}`)
      .set("X-Requester-Id", String(requesterA.id));

    // Requester A attempts to fetch a nonexistent ticket id
    const nonexistentId = 999999;
    const missingResponse = await request(app)
      .get(`/api/tickets/${nonexistentId}`)
      .set("X-Requester-Id", String(requesterA.id));

    // Non-numeric id should also return the exact same 404 body
    const nonNumericResponse = await request(app)
      .get("/api/tickets/invalid-id")
      .set("X-Requester-Id", String(requesterA.id));

    expect(unownedResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
    expect(nonNumericResponse.status).toBe(404);

    // BR-08, API-18: The 404 responses must be identical
    expect(unownedResponse.body).toEqual({
      error: {
        code: "TICKET_NOT_FOUND",
        message: "Ticket not found",
      },
    });
    expect(unownedResponse.body).toEqual(missingResponse.body);
    expect(nonNumericResponse.body).toEqual(missingResponse.body);

    // AC-30: No ticket data leaked in refusal
    const unownedBodyString = JSON.stringify(unownedResponse.body);
    expect(unownedBodyString).not.toContain(uniqueSummary);
    expect(unownedBodyString).not.toContain(uniqueDescription);
    expect(unownedBodyString).not.toContain(ticketB.ticketNumber);
  });
});
