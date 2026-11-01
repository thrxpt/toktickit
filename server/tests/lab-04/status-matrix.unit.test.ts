import { describe, expect, it } from "vitest";

import type { TicketStatus } from "../../src/generated/prisma/client";
import { getPermittedTransitions, isValidStatusTransition } from "../../src/tickets/status-machine";

// UNIT-02 expected values are the Lab 4 BR-15 contract, independent of production data.
const finalMatrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

describe("UNIT-02 — final Ticket matrix (AC-09, BR-15, BR-16)", () => {
  it.each(Object.keys(finalMatrix) as TicketStatus[])("accepts exactly the permitted outgoing edges from %s", from => {
    expect(getPermittedTransitions(from)).toEqual(finalMatrix[from]);
    for (const to of Object.keys(finalMatrix) as TicketStatus[]) {
      expect(isValidStatusTransition(from, to), `${from} → ${to}`).toBe(finalMatrix[from].includes(to));
    }
    expect(isValidStatusTransition(from, from)).toBe(false);
  });
});
