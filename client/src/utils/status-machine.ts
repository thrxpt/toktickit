import type { TicketStatus } from "../types/ticket";

/**
 * Validated status transition lifecycle matrix (BR-21, BR-22).
 */
const STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

export function getPermittedTransitions(from: TicketStatus): TicketStatus[] {
  const allowed = STATUS_TRANSITIONS[from];
  return allowed ? [...allowed] : [];
}

export function isValidStatusTransition(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  if (from === to) return false;
  const allowed = STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}
