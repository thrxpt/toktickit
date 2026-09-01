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
