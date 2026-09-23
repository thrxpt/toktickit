import { describe, expect, it } from "vitest";

import {
  commentContentSchema,
  createCommentSchema,
  createInternalNoteSchema,
} from "../../src/comments/comment-schema";

describe("UNIT-05 — Comment and note text length bounds (BR-27)", () => {
  describe("commentContentSchema", () => {
    it("accepts valid content between 1 and 2,000 characters", () => {
      const validSingleChar = "A";
      const validSentence = "This is a valid public comment or internal note.";
      const valid2000Chars = "x".repeat(2000);

      expect(commentContentSchema.safeParse(validSingleChar).success).toBe(true);
      expect(commentContentSchema.safeParse(validSentence).success).toBe(true);
      expect(commentContentSchema.safeParse(valid2000Chars).success).toBe(true);
    });

    it("trims surrounding whitespace and accepts valid trimmed content", () => {
      const padded = "   Trimmed note content   ";
      const result = commentContentSchema.safeParse(padded);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("Trimmed note content");
      }
    });

    it("rejects empty strings", () => {
      const result = commentContentSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects whitespace-only strings (BR-27)", () => {
      const spaces = "    ";
      const tabsAndNewlines = "\t\n   \r\n";

      expect(commentContentSchema.safeParse(spaces).success).toBe(false);
      expect(commentContentSchema.safeParse(tabsAndNewlines).success).toBe(false);
    });

    it("rejects content exceeding 2,000 characters (BR-27)", () => {
      const over2000 = "a".repeat(2001);
      const result = commentContentSchema.safeParse(over2000);
      expect(result.success).toBe(false);
    });

    it("rejects content where trimmed length exceeds 2,000 characters", () => {
      const paddedOver2000 = " " + "b".repeat(2001) + " ";
      const result = commentContentSchema.safeParse(paddedOver2000);
      expect(result.success).toBe(false);
    });

    it("accepts content where padded length > 2,000 but trimmed length <= 2,000", () => {
      const paddedExact2000 = "   " + "c".repeat(2000) + "   ";
      const result = commentContentSchema.safeParse(paddedExact2000);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("c".repeat(2000));
        expect(result.data.length).toBe(2000);
      }
    });
  });

  describe("createCommentSchema & createInternalNoteSchema", () => {
    it("validates request payload with trimmed content", () => {
      const commentPayload = { content: "  Valid comment text  " };
      const commentResult = createCommentSchema.safeParse(commentPayload);
      expect(commentResult.success).toBe(true);
      if (commentResult.success) {
        expect(commentResult.data.content).toBe("Valid comment text");
      }

      const notePayload = { content: "  Internal diagnostic note  " };
      const noteResult = createInternalNoteSchema.safeParse(notePayload);
      expect(noteResult.success).toBe(true);
      if (noteResult.success) {
        expect(noteResult.data.content).toBe("Internal diagnostic note");
      }
    });

    it("rejects payloads missing content or with empty content", () => {
      expect(createCommentSchema.safeParse({}).success).toBe(false);
      expect(createCommentSchema.safeParse({ content: "" }).success).toBe(false);
      expect(createCommentSchema.safeParse({ content: "   " }).success).toBe(false);

      expect(createInternalNoteSchema.safeParse({}).success).toBe(false);
      expect(createInternalNoteSchema.safeParse({ content: "" }).success).toBe(false);
      expect(createInternalNoteSchema.safeParse({ content: "   " }).success).toBe(false);
    });

    it("rejects unknown extra fields (strict schema)", () => {
      const extra = { content: "Valid", extraField: "not allowed" };
      expect(createCommentSchema.safeParse(extra).success).toBe(false);
      expect(createInternalNoteSchema.safeParse(extra).success).toBe(false);
    });
  });
});
