import { describe, expect, it } from "vitest";

import { formatTicketNumber } from "../../src/tickets/ticket-number";

describe("UNIT-01 — Ticket Number formatting from counter value (BR-11, AC-10)", () => {
  it("formats counter 42 with year 2026 into TKT-2026-000042 matching TKT-\\d{4}-\\d{6}", () => {
    const formatted = formatTicketNumber(42, 2026);
    expect(formatted).toBe("TKT-2026-000042");
    expect(formatted).toMatch(/^TKT-\d{4}-\d{6}$/);
  });

  it("pads smaller numbers with leading zeros to 6 digits", () => {
    expect(formatTicketNumber(1, 2026)).toBe("TKT-2026-000001");
    expect(formatTicketNumber(999999, 2026)).toBe("TKT-2026-999999");
  });

  it("uses current year when year parameter is omitted", () => {
    const currentYear = new Date().getFullYear();
    const formatted = formatTicketNumber(5);
    expect(formatted).toBe(`TKT-${currentYear}-000005`);
  });
});

describe("UNIT-02 — Counter above six digits does not truncate (BR-11)", () => {
  it("preserves all digits when counter exceeds 999999", () => {
    const formatted = formatTicketNumber(1234567, 2026);
    expect(formatted).toBe("TKT-2026-1234567");
    expect(formatted).not.toBe("TKT-2026-234567");
    expect(formatted).not.toBe("TKT-2026-123456");
  });
});
