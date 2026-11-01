import { describe, expect, it } from "vitest";
import { createActionSchema } from "../../src/actions/action-schema";

const valid = { description: " Checked ", result: " Healthy ", expectedVersion: 0 };
describe("UNIT-01 — AC-03, BR-04, BR-05, BR-06", () => {
  it("trims required text and accepts documented bounds and empty optional text", () => {
    expect(createActionSchema.parse(valid)).toMatchObject({ description: "Checked", result: "Healthy" });
    expect(createActionSchema.safeParse({ ...valid, description: "a".repeat(2000), result: "b".repeat(2000), attachmentNotes: "c".repeat(1000), followUpRequired: true, followUpNote: "d".repeat(2000) }).success).toBe(true);
    for (const followUpNote of [undefined, null, "", "  "]) {
      expect(createActionSchema.safeParse({ ...valid, followUpNote }).success).toBe(true);
    }
  });
  it.each([
    ["description", undefined], ["description", " "], ["description", "x".repeat(2001)],
    ["result", undefined], ["result", " "], ["result", "x".repeat(2001)],
    ["attachmentNotes", "x".repeat(1001)], ["followUpNote", "Unexpected note"],
    ["followUpRequired", "true"], ["expectedVersion", -1],
  ])("rejects invalid %s and names its field", (field, value) => {
    const parsed = createActionSchema.safeParse({ ...valid, [field]: value });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some(i => i.path[0] === field)).toBe(true);
  });
  it.each([undefined, null, "", "  "])("requires a nonblank note when follow-up is flagged (%s)", followUpNote => {
    const parsed = createActionSchema.safeParse({ ...valid, followUpRequired: true, followUpNote });
    expect(parsed.success).toBe(false);
  });
});
