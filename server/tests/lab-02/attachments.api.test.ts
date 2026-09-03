import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { UPLOADS_DIR } from "../../src/attachments/storage";
import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const PDF_HEADER = Buffer.from(
  "%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
);

function cleanUploadsDir() {
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(UPLOADS_DIR, file));
    }
  }
}

beforeEach(async () => {
  await truncateTransactionalData();
  cleanUploadsDir();
});

afterEach(() => {
  cleanUploadsDir();
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
  const category = categories[0];

  const relatedSystems = await prisma.relatedSystem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const relatedSystem = relatedSystems[0];

  const ticketA = await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-2026-000101",
      requesterId: requesterA.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: "Requester A Ticket Summary",
      description: "Requester A Ticket Description testing attachments.",
      requestedPriority: "MEDIUM",
      status: "NEW",
    },
  });

  const ticketB = await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-2026-000102",
      requesterId: requesterB.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: "Requester B Ticket Summary",
      description: "Requester B Ticket Description testing cross-requester.",
      requestedPriority: "HIGH",
      status: "NEW",
    },
  });

  return {
    requesterA,
    requesterB,
    ticketA,
    ticketB,
  };
}

describe("API-19 — Upload a valid PNG (AC-31)", () => {
  it("responds 201, stores metadata and bytes, and never exposes storageKey", async () => {
    const { requesterA, ticketA } = await getTestFixtures();

    const response = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", PNG_HEADER, "screenshot.png");

    expect(response.status).toBe(201);
    expect(response.headers.location).toMatch(
      /^\/api\/attachments\/\d+\/content$/,
    );

    const attachmentId = response.body.id;
    expect(typeof attachmentId).toBe("number");
    expect(response.body).toEqual({
      id: attachmentId,
      originalFilename: "screenshot.png",
      mimeType: "image/png",
      sizeBytes: PNG_HEADER.length,
      uploadedBy: {
        id: requesterA.id,
        name: requesterA.name,
      },
      createdAt: expect.any(String),
      contentUrl: `/api/attachments/${attachmentId}/content`,
    });

    // BR-37: storageKey is never exposed
    expect(JSON.stringify(response.body)).not.toContain("storageKey");

    // Verify row persisted
    const dbRow = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
    expect(dbRow).not.toBeNull();
    expect(dbRow?.originalFilename).toBe("screenshot.png");
    expect(dbRow?.mimeType).toBe("image/png");
    expect(dbRow?.sizeBytes).toBe(PNG_HEADER.length);
    expect(dbRow?.storageKey).toBeDefined();

    // Verify bytes written to uploads directory
    const filePath = path.join(UPLOADS_DIR, dbRow!.storageKey);
    expect(fs.existsSync(filePath)).toBe(true);
    const savedBytes = fs.readFileSync(filePath);
    expect(savedBytes.equals(PNG_HEADER)).toBe(true);
  });

  it("responds 400 REQUESTER_ID_IN_BODY when requesterId is present in multipart body (BR-04)", async () => {
    const { requesterA, ticketA } = await getTestFixtures();

    const response = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .field("requesterId", "99")
      .attach("file", PNG_HEADER, "screenshot.png");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "REQUESTER_ID_IN_BODY",
        message: "requesterId must not be supplied in the request body",
      },
    });
  });
});

describe("API-20 — Upload a 6 MB file (AC-32, BR-34)", () => {
  it("responds 413, leaves no row in DB and no orphaned file in uploads", async () => {
    const { requesterA, ticketA } = await getTestFixtures();
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 0x25); // 6 MB

    const response = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", oversizedBuffer, "large-document.pdf");

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: {
        code: "FILE_TOO_LARGE",
        message: "Each file must be 5 MB or smaller.",
        fields: {
          file: "Each file must be 5 MB or smaller.",
        },
      },
    });

    const count = await prisma.attachment.count({
      where: { ticketId: ticketA.id },
    });
    expect(count).toBe(0);

    const filesInUploads = fs.existsSync(UPLOADS_DIR)
      ? fs.readdirSync(UPLOADS_DIR)
      : [];
    expect(filesInUploads.length).toBe(0);
  });
});

describe("API-21 — Upload a disguised file (AC-33, BR-33)", () => {
  it("responds 415, persists nothing when extension/header claim PNG but bytes are text", async () => {
    const { requesterA, ticketA } = await getTestFixtures();
    const disguisedBytes = Buffer.from("plain text claiming to be a PNG");

    const response = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", disguisedBytes, {
        filename: "photo.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(415);
    expect(response.body).toEqual({
      error: {
        code: "UNSUPPORTED_FILE_TYPE",
        message:
          "Unsupported file type. Permitted types are JPG, PNG, WEBP, and PDF.",
      },
    });

    const count = await prisma.attachment.count({
      where: { ticketId: ticketA.id },
    });
    expect(count).toBe(0);

    const filesInUploads = fs.existsSync(UPLOADS_DIR)
      ? fs.readdirSync(UPLOADS_DIR)
      : [];
    expect(filesInUploads.length).toBe(0);
  });
});

describe("API-22 — Sixth active upload, then remove one and retry (AC-34, AC-39, BR-35)", () => {
  it("refuses 6th upload with 409, then permits upload after one removal", async () => {
    const { requesterA, ticketA } = await getTestFixtures();

    const uploadedIds: number[] = [];

    // Upload 5 attachments
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post(`/api/tickets/${ticketA.id}/attachments`)
        .set("X-Requester-Id", String(requesterA.id))
        .attach("file", PNG_HEADER, `screenshot-${i}.png`);

      expect(res.status).toBe(201);
      uploadedIds.push(res.body.id);
    }

    // Attempt 6th upload -> 409 ATTACHMENT_LIMIT_REACHED
    const sixthRes = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", PNG_HEADER, "screenshot-6.png");

    expect(sixthRes.status).toBe(409);
    expect(sixthRes.body).toEqual({
      error: {
        code: "ATTACHMENT_LIMIT_REACHED",
        message: "A ticket may hold at most 5 active attachments.",
      },
    });

    // Soft-remove one attachment
    const removeRes = await request(app)
      .post(`/api/attachments/${uploadedIds[0]}/removal`)
      .set("X-Requester-Id", String(requesterA.id))
      .send({ reason: "Freeing a slot for another screenshot" });

    expect(removeRes.status).toBe(200);

    // 6th upload should now succeed (AC-39: removal frees a slot)
    const retryRes = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", PNG_HEADER, "screenshot-retry.png");

    expect(retryRes.status).toBe(201);
    expect(retryRes.body.originalFilename).toBe("screenshot-retry.png");

    // Total rows in DB is 6, but active count is 5
    const totalCount = await prisma.attachment.count({
      where: { ticketId: ticketA.id },
    });
    expect(totalCount).toBe(6);

    const activeCount = await prisma.attachment.count({
      where: { ticketId: ticketA.id, removedAt: null },
    });
    expect(activeCount).toBe(5);
  });
});

describe("API-23 — Soft removal with and without a reason (AC-36, AC-38, BR-22)", () => {
  it("rejects blank/missing reason with 400 and keeps attachment active; succeeds with valid reason", async () => {
    const { requesterA, ticketA } = await getTestFixtures();

    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", PNG_HEADER, "evidence.png");

    const attachmentId = uploadRes.body.id;

    // Removal without reason -> 400
    const noReasonRes = await request(app)
      .post(`/api/attachments/${attachmentId}/removal`)
      .set("X-Requester-Id", String(requesterA.id))
      .send({});

    expect(noReasonRes.status).toBe(400);
    expect(noReasonRes.body.error.code).toBe("VALIDATION_FAILED");

    // Removal with whitespace-only reason -> 400
    const blankReasonRes = await request(app)
      .post(`/api/attachments/${attachmentId}/removal`)
      .set("X-Requester-Id", String(requesterA.id))
      .send({ reason: "     " });

    expect(blankReasonRes.status).toBe(400);
    expect(blankReasonRes.body.error.code).toBe("VALIDATION_FAILED");

    // Verify still active
    const stillActive = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
    expect(stillActive?.removedAt).toBeNull();

    // Soft removal with valid reason -> 200
    const successRes = await request(app)
      .post(`/api/attachments/${attachmentId}/removal`)
      .set("X-Requester-Id", String(requesterA.id))
      .send({ reason: "Uploaded the wrong file" });

    expect(successRes.status).toBe(200);
    expect(successRes.body).toEqual({
      id: attachmentId,
      originalFilename: "evidence.png",
      mimeType: "image/png",
      sizeBytes: PNG_HEADER.length,
      uploadedBy: {
        id: requesterA.id,
        name: requesterA.name,
      },
      createdAt: expect.any(String),
      removedAt: expect.any(String),
      removedBy: {
        id: requesterA.id,
        name: requesterA.name,
      },
      removalReason: "Uploaded the wrong file",
    });

    // Content URL must NOT be present on removed attachment (BR-39)
    expect(successRes.body).not.toHaveProperty("contentUrl");

    // Second removal of the same attachment must return 404 (non-idempotent)
    const secondRemovalRes = await request(app)
      .post(`/api/attachments/${attachmentId}/removal`)
      .set("X-Requester-Id", String(requesterA.id))
      .send({ reason: "Trying to remove again" });

    expect(secondRemovalRes.status).toBe(404);
    expect(secondRemovalRes.body).toEqual({
      error: {
        code: "ATTACHMENT_NOT_FOUND",
        message: "Attachment not found",
      },
    });
  });
});

describe("API-24 — Content of a removed Attachment, and of another Requester's (AC-37, AC-40, BR-39)", () => {
  it("responds 404 with identical error envelope for removed, unowned, and missing attachments", async () => {
    const { requesterA, requesterB, ticketA, ticketB } =
      await getTestFixtures();

    // Upload attachment to Ticket A
    const uploadARes = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", PNG_HEADER, "ticket-a.png");

    const attachmentAId = uploadARes.body.id;

    // Upload attachment to Ticket B
    const uploadBRes = await request(app)
      .post(`/api/tickets/${ticketB.id}/attachments`)
      .set("X-Requester-Id", String(requesterB.id))
      .attach("file", PNG_HEADER, "ticket-b.png");

    const attachmentBId = uploadBRes.body.id;

    // Soft remove attachment A
    await request(app)
      .post(`/api/attachments/${attachmentAId}/removal`)
      .set("X-Requester-Id", String(requesterA.id))
      .send({ reason: "Removed by requester" });

    // 1. Requester A requests removed attachment A (AC-37)
    const removedRes = await request(app)
      .get(`/api/attachments/${attachmentAId}/content`)
      .set("X-Requester-Id", String(requesterA.id));

    // 2. Requester A requests Requester B's attachment (AC-40)
    const unownedRes = await request(app)
      .get(`/api/attachments/${attachmentBId}/content`)
      .set("X-Requester-Id", String(requesterA.id));

    // 3. Nonexistent attachment id
    const missingRes = await request(app)
      .get("/api/attachments/999999/content")
      .set("X-Requester-Id", String(requesterA.id));

    expect(removedRes.status).toBe(404);
    expect(unownedRes.status).toBe(404);
    expect(missingRes.status).toBe(404);

    const expected404 = {
      error: {
        code: "ATTACHMENT_NOT_FOUND",
        message: "Attachment not found",
      },
    };

    expect(removedRes.body).toEqual(expected404);
    expect(unownedRes.body).toEqual(expected404);
    expect(missingRes.body).toEqual(expected404);
  });
});

describe("API-25 — Download an active Attachment (AC-35)", () => {
  it("responds 200 with bytes, Content-Type, Content-Length, and Content-Disposition inline for images and attachment for PDF", async () => {
    const { requesterA, ticketA } = await getTestFixtures();

    // Upload image
    const imageUpload = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", PNG_HEADER, "my screenshot.png");

    const imageId = imageUpload.body.id;

    // Download image
    const imageDownload = await request(app)
      .get(`/api/attachments/${imageId}/content`)
      .set("X-Requester-Id", String(requesterA.id));

    expect(imageDownload.status).toBe(200);
    expect(imageDownload.headers["content-type"]).toBe("image/png");
    expect(imageDownload.headers["x-content-type-options"]).toBe("nosniff");
    expect(imageDownload.headers["content-length"]).toBe(
      String(PNG_HEADER.length),
    );
    expect(imageDownload.headers["content-disposition"]).toContain("inline;");
    expect(imageDownload.headers["content-disposition"]).toContain(
      'filename="my screenshot.png"',
    );
    expect(imageDownload.body).toEqual(PNG_HEADER);

    // Upload PDF with semicolon in filename to verify header sanitization
    const pdfUpload = await request(app)
      .post(`/api/tickets/${ticketA.id}/attachments`)
      .set("X-Requester-Id", String(requesterA.id))
      .attach("file", PDF_HEADER, "report;version=2.pdf");

    const pdfId = pdfUpload.body.id;

    // Download PDF
    const pdfDownload = await request(app)
      .get(`/api/attachments/${pdfId}/content`)
      .set("X-Requester-Id", String(requesterA.id));

    expect(pdfDownload.status).toBe(200);
    expect(pdfDownload.headers["content-type"]).toBe("application/pdf");
    expect(pdfDownload.headers["x-content-type-options"]).toBe("nosniff");
    expect(pdfDownload.headers["content-length"]).toBe(
      String(PDF_HEADER.length),
    );
    expect(pdfDownload.headers["content-disposition"]).toContain("attachment;");
    // Semicolon should be replaced with underscore in ASCII fallback
    expect(pdfDownload.headers["content-disposition"]).toContain(
      'filename="report_version=2.pdf"',
    );
    expect(pdfDownload.body).toEqual(PDF_HEADER);
  });
});
