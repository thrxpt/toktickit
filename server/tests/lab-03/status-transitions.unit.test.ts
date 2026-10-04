import { describe, expect, it } from "vitest";

import type { TicketStatus } from "../../src/generated/prisma/client";
import {
  getPermittedTransitions,
  isValidStatusTransition,
} from "../../src/tickets/status-machine";

describe("UNIT-03 — Permitted status transitions (BR-22)", () => {
  const permittedMatrix: Record<TicketStatus, TicketStatus[]> = {
    NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
    OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED", "REOPENED"],
    CLOSED: ["REOPENED"],
    REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    CANCELLED: [],
  };

  it("permits every documented transition in the lifecycle matrix", () => {
    for (const [from, allowedList] of Object.entries(permittedMatrix) as [
      TicketStatus,
      TicketStatus[],
    ][]) {
      for (const to of allowedList) {
        expect(
          isValidStatusTransition(from, to),
          `Expected ${from} -> ${to} to be permitted`,
        ).toBe(true);
      }
    }
  });

  it("returns exactly the permitted transitions for each status", () => {
    for (const [from, expectedList] of Object.entries(permittedMatrix) as [
      TicketStatus,
      TicketStatus[],
    ][]) {
      const transitions = getPermittedTransitions(from);
      expect(transitions).toEqual(expectedList);
    }
  });
});

describe("UNIT-04 — Forbidden status transitions (BR-22)", () => {
  const allStatuses: TicketStatus[] = [
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_REQUESTER",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
  ];

  const permittedMatrix: Record<TicketStatus, TicketStatus[]> = {
    NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
    OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED", "REOPENED"],
    CLOSED: ["REOPENED"],
    REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    CANCELLED: [],
  };

  it("rejects invalid transitions across the entire status matrix", () => {
    for (const from of allStatuses) {
      const allowed = new Set(permittedMatrix[from]);
      for (const to of allStatuses) {
        if (!allowed.has(to)) {
          expect(
            isValidStatusTransition(from, to),
            `Expected ${from} -> ${to} to be rejected`,
          ).toBe(false);
        }
      }
    }
  });

  it("treats CANCELLED as a terminal state with no permitted transitions", () => {
    expect(getPermittedTransitions("CANCELLED")).toEqual([]);
    for (const to of allStatuses) {
      expect(isValidStatusTransition("CANCELLED", to)).toBe(false);
    }
  });

  it("rejects self-transitions", () => {
    for (const status of allStatuses) {
      expect(isValidStatusTransition(status, status)).toBe(false);
    }
  });
});
