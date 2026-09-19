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
}
