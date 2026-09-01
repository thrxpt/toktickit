export type RequestedPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type TicketStatus = 'NEW'

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
