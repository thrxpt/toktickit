// Attachment serializer for Ticket Detail and Attachment metadata routes (Issue 11/12).
//
// Shared between GET /api/tickets/:id, GET /api/tickets/:ticketId/attachments,
// and attachment POST endpoints so the routes cannot drift (api-spec.md).

export interface ActiveAttachmentDto {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: {
    id: number;
    name: string;
  };
  createdAt: string;
  contentUrl: string;
}

export interface RemovedAttachmentDto {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: {
    id: number;
    name: string;
  };
  createdAt: string;
  removedAt: string;
  removedBy: {
    id: number;
    name: string;
  };
  removalReason: string;
}

export interface AttachmentGroupsDto {
  active: ActiveAttachmentDto[];
  removed: RemovedAttachmentDto[];
}

export interface AttachmentRecord {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
  uploadedBy: {
    id: number;
    name: string;
  };
  createdAt: Date | string;
  removedAt?: Date | string | null;
  removedBy?: {
    id: number;
    name: string;
  } | null;
  removalReason?: string | null;
}

function formatIsoString(
  date: Date | string | null | undefined,
  fallback = new Date().toISOString(),
): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  if (date) {
    return new Date(date).toISOString();
  }
  return fallback;
}

export function serializeActiveAttachment(
  attachment: AttachmentRecord,
): ActiveAttachmentDto {
  return {
    id: attachment.id,
    originalFilename: attachment.originalFilename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uploadedBy: {
      id: attachment.uploadedBy.id,
      name: attachment.uploadedBy.name,
    },
    createdAt: formatIsoString(attachment.createdAt),
    contentUrl: `/api/attachments/${attachment.id}/content`,
  };
}

export function serializeRemovedAttachment(
  attachment: AttachmentRecord,
): RemovedAttachmentDto {
  return {
    id: attachment.id,
    originalFilename: attachment.originalFilename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uploadedBy: {
      id: attachment.uploadedBy.id,
      name: attachment.uploadedBy.name,
    },
    createdAt: formatIsoString(attachment.createdAt),
    removedAt: formatIsoString(attachment.removedAt),
    removedBy: {
      id: attachment.removedBy?.id ?? attachment.uploadedBy.id,
      name: attachment.removedBy?.name ?? attachment.uploadedBy.name,
    },
    removalReason: attachment.removalReason ?? "",
  };
}

export function serializeAttachments(
  attachments: AttachmentRecord[] = [],
): AttachmentGroupsDto {
  const active: ActiveAttachmentDto[] = [];
  const removed: RemovedAttachmentDto[] = [];

  for (const attachment of attachments) {
    if (attachment.removedAt) {
      removed.push(serializeRemovedAttachment(attachment));
    } else {
      active.push(serializeActiveAttachment(attachment));
    }
  }

  return {
    active,
    removed,
  };
}
