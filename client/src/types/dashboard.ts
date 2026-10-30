import type { ITPriority, TicketStatus } from "./ticket";
import type { UserRole } from "./auth";
export interface DashboardTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  status: TicketStatus;
  itPriority: ITPriority;
  updatedAt: string;
  owner?: { id: number; name: string } | null;
}
export interface RequesterDashboardData {
  openTickets: number;
  waitingForRequester: number;
  recentlyUpdated: DashboardTicket[];
  recentlyResolved: DashboardTicket[];
}
export interface StaffDashboardData {
  unassigned: number;
  ownedByMe: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<ITPriority, number>;
  recentlyUpdated: DashboardTicket[];
  userCounts?: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  };
}
