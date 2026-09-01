import { describe, expect, it } from "vitest";

import { createTicketSchema } from "../../src/tickets/ticket-schema";

describe("UNIT-05 — Ticket schema trimming and bounds (BR-19, BR-20, BR-21)", () => {
  const validPayload = {
    summary: "Laptop battery drains quickly",
    description: "My laptop battery is draining much faster than usual even when idle.",
    categoryId: 2,
    relatedSystemId: 7,
    requestedPriority: "MEDIUM",
  };

  it("accepts valid payload and returns trimmed values", () => {
    const result = createTicketSchema.safeParse({
      ...validPayload,
      summary: "   Valid summary with padding   ",
      description: "   Valid description with padding around it for testing.   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe("Valid summary with padding");
      expect(result.data.description).toBe("Valid description with padding around it for testing.");
      expect(result.data.categoryId).toBe(2);
      expect(result.data.relatedSystemId).toBe(7);
      expect(result.data.requestedPriority).toBe("MEDIUM");
    }
  });

  describe("summary bounds and trimming (BR-19, BR-20)", () => {
    it("fails when summary is empty or whitespace-only (BR-19, AC-12)", () => {
      const emptyResult = createTicketSchema.safeParse({
        ...validPayload,
        summary: "",
      });
      expect(emptyResult.success).toBe(false);

      const spacesResult = createTicketSchema.safeParse({
        ...validPayload,
        summary: "     ",
      });
      expect(spacesResult.success).toBe(false);
    });

    it("fails when trimmed summary is 4 characters (below 5)", () => {
      const result = createTicketSchema.safeParse({
        ...validPayload,
        summary: "   abcd   ",
      });
      expect(result.success).toBe(false);
    });

    it("passes when trimmed summary is exactly 5 characters", () => {
      const result = createTicketSchema.safeParse({
        ...validPayload,
        summary: "  12345  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe("12345");
      }
    });

    it("passes when trimmed summary is exactly 150 characters", () => {
      const summary150 = "a".repeat(150);
      const result = createTicketSchema.safeParse({
        ...validPayload,
        summary: `  ${summary150}  `,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe(summary150);
      }
    });

    it("fails when trimmed summary is 151 characters (BR-20, AC-13)", () => {
      const summary151 = "a".repeat(151);
      const result = createTicketSchema.safeParse({
        ...validPayload,
        summary: summary151,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("description bounds and trimming (BR-19, BR-21)", () => {
    it("fails when description is empty or whitespace-only (BR-19)", () => {
      const emptyResult = createTicketSchema.safeParse({
        ...validPayload,
        description: "",
      });
      expect(emptyResult.success).toBe(false);

      const spacesResult = createTicketSchema.safeParse({
        ...validPayload,
        description: "         ",
      });
      expect(spacesResult.success).toBe(false);
    });

    it("fails when trimmed description is 9 characters (below 10)", () => {
      const result = createTicketSchema.safeParse({
        ...validPayload,
        description: "123456789",
      });
      expect(result.success).toBe(false);
    });

    it("passes when trimmed description is exactly 10 characters", () => {
      const result = createTicketSchema.safeParse({
        ...validPayload,
        description: "  1234567890  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe("1234567890");
      }
    });

    it("passes when trimmed description is exactly 4000 characters", () => {
      const desc4000 = "b".repeat(4000);
      const result = createTicketSchema.safeParse({
        ...validPayload,
        description: `  ${desc4000}  `,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(desc4000);
      }
    });

    it("fails when trimmed description is 4001 characters (BR-21)", () => {
      const desc4001 = "b".repeat(4001);
      const result = createTicketSchema.safeParse({
        ...validPayload,
        description: desc4001,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("classification and priority fields (BR-14, BR-16, BR-17)", () => {
    it("fails when categoryId is missing or not an integer", () => {
      expect(createTicketSchema.safeParse({ ...validPayload, categoryId: undefined }).success).toBe(false);
      expect(createTicketSchema.safeParse({ ...validPayload, categoryId: "2" }).success).toBe(false);
      expect(createTicketSchema.safeParse({ ...validPayload, categoryId: 2.5 }).success).toBe(false);
    });

    it("fails when relatedSystemId is missing or not an integer", () => {
      expect(createTicketSchema.safeParse({ ...validPayload, relatedSystemId: undefined }).success).toBe(false);
      expect(createTicketSchema.safeParse({ ...validPayload, relatedSystemId: "7" }).success).toBe(false);
      expect(createTicketSchema.safeParse({ ...validPayload, relatedSystemId: 7.2 }).success).toBe(false);
    });

    it("fails when requestedPriority is omitted (BR-14: no server default)", () => {
      expect(createTicketSchema.safeParse({ ...validPayload, requestedPriority: undefined }).success).toBe(false);
    });

    it.each(["LOW", "MEDIUM", "HIGH"] as const)("accepts requestedPriority '%s'", (priority) => {
      const result = createTicketSchema.safeParse({
        ...validPayload,
        requestedPriority: priority,
      });
      expect(result.success).toBe(true);
    });

    it("fails when requestedPriority is an invalid enum value", () => {
      expect(createTicketSchema.safeParse({ ...validPayload, requestedPriority: "URGENT" }).success).toBe(false);
    });
  });
});
