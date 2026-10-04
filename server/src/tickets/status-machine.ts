import type { TicketStatus } from "../generated/prisma/client";

/**
 * Validated status transition lifecycle matrix (BR-21, BR-22).
 *
 * Rules:
 * - NEW -> OPEN, IN_PROGRESS, CANCELLED
 * - OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * - IN_PROGRESS -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * - WAITING_FOR_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
 * - RESOLVED -> CLOSED, REOPENED
 * - CLOSED -> REOPENED
 * - REOPENED -> IN_PROGRESS, RESOLVED, CANCELLED
 * - CANCELLED -> terminal state (no transitions allowed)
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

/**
 * Checks whether transitioning from `from` status to `to` status is allowed by BR-22.
 */
export function isValidStatusTransition(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  if (from === to) {
    return false;
  }
  const allowed = STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Returns the list of permitted next statuses for a given ticket status (BR-22).
 */
export function getPermittedTransitions(from: TicketStatus): TicketStatus[] {
  const allowed = STATUS_TRANSITIONS[from];
  return allowed ? [...allowed] : [];
}
