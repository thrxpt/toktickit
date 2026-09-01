// Attachment serializer for Ticket Detail and Attachment metadata routes (Issue 11/12).
//
// Shared between GET /api/tickets/:id and GET /api/tickets/:ticketId/attachments
// so the two routes cannot drift (api-spec.md).

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

export function serializeAttachments(_attachments: unknown[] = []): AttachmentGroupsDto {
  // In Issue 11, no attachments exist yet. Both groups are returned empty (API-17).
  // In Issue 12, this will partition attachments by active vs removed (BR-38, BR-39).
  return {
    active: [],
    removed: [],
  };
}
