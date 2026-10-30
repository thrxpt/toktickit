import type { UserRole } from "./auth";

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";

export type ITPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export interface StaffQueueTicketItem {
  version: number;
  id: number;
  ticketNumber: string;
  summary: string;
  categoryName: string;
  requestedPriority: RequestedPriority;
  itPriority: ITPriority;
  status: TicketStatus;
  ticketOwner: {
    id: number;
    name: string;
  } | null;
  requester: {
    id: number;
    name: string;
  };
  resolvedByRequester: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueueResponse {
  items: StaffQueueTicketItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface TicketListItem {
  version: number;
  id: number
  ticketNumber: string
  summary: string
  requestedPriority: RequestedPriority
  status: TicketStatus
  category: {
    id: number
    name: string
  }
  relatedSystem: {
    id: number
    name: string
  }
  createdAt: string
  updatedAt: string
}

export interface TicketListMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface TicketListResponse {
  data: TicketListItem[]
  meta: TicketListMeta
}

export interface AttachmentDto {
  id: number
  originalFilename: string
  mimeType: string
  sizeBytes: number
  uploadedBy: {
    id: number
    name: string
  }
  createdAt: string
  contentUrl?: string
  removedAt?: string
  removedBy?: {
    id: number
    name: string
  }
  removalReason?: string
}

export interface TicketDetail {
  version: number;
  id: number
  ticketNumber: string
  summary: string
  description: string
  requestedPriority: RequestedPriority
  status: TicketStatus
  category: {
    id: number
    name: string
  }
  relatedSystem: {
    id: number
    name: string
  }
  requester: {
    id: number
    name: string
  }
  createdAt: string
  updatedAt: string
  attachments: {
    active: AttachmentDto[]
    removed: AttachmentDto[]
  }
  resolvedByRequester?: boolean
}

export interface CommentAuthor {
  id: number;
  name: string;
  role: UserRole;
}

export interface CommentDto {
  id: number;
  content: string;
  createdAt: string;
  author: CommentAuthor;
}

export interface InternalNoteDto {
  id: number;
  content: string;
  createdAt: string;
  author: CommentAuthor;
}

export interface StaffTicketDetailDto {
  version: number;
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  category: {
    id: number;
    name: string;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
  requester: {
    id: number;
    name: string;
    email: string;
  };
  ticketOwner: {
    id: number;
    name: string;
  } | null;
  requestedPriority: RequestedPriority;
  itPriority: ITPriority;
  status: TicketStatus;
  resolvedByRequester: boolean;
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentDto[];
  publicCommentsCount: number;
  internalNotesCount: number;
}

export interface ActionTakenDto {
  id: number;
  ticketId: number;
  description: string;
  result: string;
  performedBy: CommentAuthor;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
