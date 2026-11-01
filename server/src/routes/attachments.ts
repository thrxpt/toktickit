import { createOnce, submissionKey, validateSubmissionKey } from "../submissions";
import crypto from "node:crypto";
import fs from "node:fs";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import { z } from "zod";

import { removeAttachmentSchema } from "../attachments/attachment-schema";
import { validateFileType } from "../attachments/file-type";
import {
  attachmentFileExists,
  deleteAttachmentFile,
  formatContentDisposition,
  getStorageFilePath,
  writeAttachmentFile,
} from "../attachments/storage";
import { sendError } from "../errors";
import { requireAuth } from "../middleware/auth";
import {
  rejectRequesterIdInBody,
  requireRequesterContext,
} from "../middleware/requester-context";
import { prisma } from "../prisma";
import {
  serializeActiveAttachment,
  serializeAttachments,
  serializeRemovedAttachment,
} from "../tickets/attachment-serializer";
import { formatZodFields } from "../tickets/ticket-schema";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (BR-34)

// Multer configured with memoryStorage so magic bytes can be inspected before writing to disk (D-10).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

export const attachmentsRouter = express.Router();

// Middleware to check ticket existence and ownership before multer consumes payload (api-spec.md ordering).
async function checkTicketOwnershipAndLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const requesterId = req.requesterId;
  if (!requesterId) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  const idResult = z
    .string()
    .regex(/^[1-9]\d*$/)
    .safeParse(req.params.ticketId);
  if (!idResult.success) {
    sendError(res, "TICKET_NOT_FOUND");
    return;
  }

  const ticketId = parseInt(idResult.data, 10);

  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        requesterId,
      },
      select: { id: true },
    });

    if (!ticket) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    const activeCount = await prisma.attachment.count({
      where: {
        ticketId,
        removedAt: null,
      },
    });

    if (activeCount >= 5 && !req.header("Idempotency-Key")) {
      sendError(res, "ATTACHMENT_LIMIT_REACHED");
      return;
    }

    next();
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
}

// Wrapper for multer single upload to catch LIMIT_FILE_SIZE and translate to 413 envelope
function handleSingleUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        sendError(res, "FILE_TOO_LARGE", {
          file: "Each file must be 5 MB or smaller.",
        });
        return;
      }
      sendError(res, "VALIDATION_FAILED", {
        file: "Invalid file upload.",
      });
      return;
    }
    next();
  });
}

// GET /api/tickets/:ticketId/attachments (FR-11, BR-07, BR-35, BR-39)
export async function getTicketAttachments(
  req: Request,
  res: Response,
): Promise<void> {
  const requesterId = req.requesterId;
  if (!requesterId) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  const idResult = z
    .string()
    .regex(/^[1-9]\d*$/)
    .safeParse(req.params.ticketId);
  if (!idResult.success) {
    sendError(res, "TICKET_NOT_FOUND");
    return;
  }

  const ticketId = parseInt(idResult.data, 10);

  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        requesterId,
      },
      select: { id: true },
    });

    if (!ticket) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        removedBy: { select: { id: true, name: true } },
      },
    });

    res.status(200).json(serializeAttachments(attachments));
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
}

// POST /api/tickets/:ticketId/attachments (FR-12, BR-04, BR-32, BR-33, BR-34, BR-35, BR-37, BR-40, BR-41)
export const postTicketAttachmentHandlers = [
  validateSubmissionKey,
  checkTicketOwnershipAndLimit,
  handleSingleUpload,
  rejectRequesterIdInBody,
  async (req: Request, res: Response): Promise<void> => {
    const requesterId = req.requesterId!;
    const ticketIdParam = Array.isArray(req.params.ticketId)
      ? req.params.ticketId[0]
      : req.params.ticketId;
    const ticketId = parseInt(ticketIdParam ?? "", 10);

    const file = req.file;
    if (!file) {
      sendError(res, "VALIDATION_FAILED", {
        file: "File is required.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      sendError(res, "FILE_TOO_LARGE", {
        file: "Each file must be 5 MB or smaller.",
      });
      return;
    }

    const typeValidation = validateFileType({
      filename: file.originalname,
      declaredMimeType: file.mimetype,
      buffer: file.buffer,
    });

    if (!typeValidation.valid || !typeValidation.mimeType) {
      sendError(res, "UNSUPPORTED_FILE_TYPE");
      return;
    }

    const mimeType = typeValidation.mimeType;
    const storageKey = crypto.randomUUID();

    try {
      await writeAttachmentFile(storageKey, file.buffer);

      const key = submissionKey(req, {
        filename: file.originalname, mimeType,
        bytes: crypto.createHash("sha256").update(file.buffer).digest("hex"),
      });
      const include = { uploadedBy: { select: { id: true, name: true } } } as const;
      const attachment = await createOnce(key,
        () => prisma.attachment.findUnique({ where: { submissionKey: key! }, include }),
        () => prisma.$transaction(async tx => {
          // BR-35: serialize uploads on this Ticket, including distinct keys.
          await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
          if (key) {
            const existing = await tx.attachment.findUnique({ where: { submissionKey: key }, include });
            if (existing) return existing;
          }
          const count = await tx.attachment.count({ where: { ticketId, removedAt: null } });
          if (count >= 5) return null;
          return tx.attachment.create({
            data: {
              ticketId, originalFilename: file.originalname, mimeType,
              sizeBytes: file.size, storageKey, uploadedById: requesterId, submissionKey: key,
            },
            include,
          });
        }),
      );
      if (!attachment || attachment.storageKey !== storageKey) await deleteAttachmentFile(storageKey);
      if (!attachment) {
        sendError(res, "ATTACHMENT_LIMIT_REACHED");
        return;
      }

      if (attachment.removedAt) {
        sendError(res, "ATTACHMENT_NOT_FOUND");
        return;
      }

      res
        .status(201)
        .header("Location", `/api/attachments/${attachment.id}/content`)
        .json(serializeActiveAttachment(attachment));
    } catch {
      await deleteAttachmentFile(storageKey);
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
];

// Helper to stream attachment content once authorization is established
async function streamAttachmentContent(
  res: Response,
  attachment: {
    storageKey: string;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
  },
): Promise<void> {
  const fileExists = await attachmentFileExists(attachment.storageKey);
  if (!fileExists) {
    sendError(res, "ATTACHMENT_NOT_FOUND");
    return;
  }

  const filePath = getStorageFilePath(attachment.storageKey);
  const disposition = formatContentDisposition(
    attachment.mimeType,
    attachment.originalFilename,
  );

  res.setHeader("Content-Type", attachment.mimeType);
  res.setHeader("Content-Length", attachment.sizeBytes);
  res.setHeader("Content-Disposition", disposition);
  res.setHeader("X-Content-Type-Options", "nosniff");

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      sendError(res, "ATTACHMENT_NOT_FOUND");
    }
  });
  stream.pipe(res);
}

// GET /api/attachments/:id/content (FR-13, BR-36, BR-37, BR-39, BR-40, AC-35, AC-37, AC-40)
// Permitted roles per specification.md §8: Requester / Staff
attachmentsRouter.get("/:id/content", requireAuth, async (req: Request, res: Response) => {
  const idResult = z.string().regex(/^[1-9]\d*$/).safeParse(req.params.id);
  if (!idResult.success) {
    sendError(res, "ATTACHMENT_NOT_FOUND");
    return;
  }
  const user = req.user!;
  try {
    // BR-30, ADR-0010: session ownership for Requesters, operational reads for Staff/Admin.
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: Number(idResult.data),
        removedAt: null,
        ...(user.role === "REQUESTER" ? { ticket: { requesterId: user.id } } : {}),
      },
    });
    if (!attachment) {
      sendError(res, "ATTACHMENT_NOT_FOUND");
      return;
    }
    await streamAttachmentContent(res, attachment);
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

// POST /api/attachments/:id/removal and /api/attachments/:id/remove (FR-14, BR-04, BR-22, BR-38, BR-42, AC-36, AC-38)
attachmentsRouter.post(
  ["/:id/removal", "/:id/remove"],
  requireRequesterContext,
  rejectRequesterIdInBody,
  async (req: Request, res: Response) => {
    const requesterId = req.requesterId;
    if (!requesterId) {
      sendError(res, "UNAUTHENTICATED");
      return;
    }

    const idResult = z
      .string()
      .regex(/^[1-9]\d*$/)
      .safeParse(req.params.id);
    if (!idResult.success) {
      sendError(res, "ATTACHMENT_NOT_FOUND");
      return;
    }

    const id = parseInt(idResult.data, 10);

    const parseResult = removeAttachmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, "VALIDATION_FAILED", formatZodFields(parseResult.error));
      return;
    }

    const { reason } = parseResult.data;

    try {
      // Find active attachment belonging to owned ticket (already removed returns 404)
      const attachment = await prisma.attachment.findFirst({
        where: {
          id,
          removedAt: null,
          ticket: {
            requesterId,
          },
        },
      });

      if (!attachment) {
        sendError(res, "ATTACHMENT_NOT_FOUND");
        return;
      }

      const updated = await prisma.attachment.update({
        where: { id: attachment.id },
        data: {
          removedAt: new Date(),
          removedById: requesterId,
          removalReason: reason,
        },
        include: {
          uploadedBy: { select: { id: true, name: true } },
          removedBy: { select: { id: true, name: true } },
        },
      });

      res.status(200).json(serializeRemovedAttachment(updated));
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);
