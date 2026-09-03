import { describe, expect, it } from "vitest";

import {
  detectFileType,
  validateFileType,
} from "../../src/attachments/file-type";

describe("UNIT-03: Magic-byte detection for each permitted type (BR-33)", () => {
  it("identifies JPEG files from magic bytes alone (FF D8 FF)", () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectFileType(jpegBuffer)).toBe("image/jpeg");
  });

  it("identifies PNG files from magic bytes alone (89 50 4E 47 0D 0A 1A 0A)", () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(detectFileType(pngBuffer)).toBe("image/png");
  });

  it("identifies WEBP files from magic bytes alone (RIFF ... WEBP)", () => {
    // RIFF (4 bytes) + 4 bytes file size + WEBP (4 bytes)
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20,
    ]);
    expect(detectFileType(webpBuffer)).toBe("image/webp");
  });

  it("identifies PDF files from magic bytes alone (%PDF)", () => {
    const pdfBuffer = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37,
    ]);
    expect(detectFileType(pdfBuffer)).toBe("application/pdf");
  });

  it("returns null for unknown byte signatures or short buffers", () => {
    expect(detectFileType(Buffer.from([]))).toBeNull();
    expect(detectFileType(Buffer.from([0x00, 0x01, 0x02]))).toBeNull();
    expect(
      detectFileType(Buffer.from("Hello world, plain text file")),
    ).toBeNull();
    expect(detectFileType(Buffer.from([0x52, 0x49, 0x46, 0x46]))).toBeNull(); // RIFF without WEBP
  });
});

describe("UNIT-04: Disguised file and three-way agreement (BR-33, AC-33)", () => {
  it("accepts when filename extension, declared MIME, and magic bytes all agree", () => {
    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    const result = validateFileType({
      filename: "screenshot.png",
      declaredMimeType: "image/png",
      buffer: validPngBytes,
    });
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/png");
  });

  it("accepts both .jpg and .jpeg extensions for JPEG", () => {
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe1]);
    expect(
      validateFileType({
        filename: "photo.jpg",
        declaredMimeType: "image/jpeg",
        buffer: jpegBytes,
      }).valid,
    ).toBe(true);
    expect(
      validateFileType({
        filename: "photo.JPEG",
        declaredMimeType: "image/jpeg",
        buffer: jpegBytes,
      }).valid,
    ).toBe(true);
  });

  it("rejects .png file with image/png header but non-PNG bytes (disguised text)", () => {
    const textBytes = Buffer.from("Not really a png file content");
    const result = validateFileType({
      filename: "photo.png",
      declaredMimeType: "image/png",
      buffer: textBytes,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects .png file with image/png header but JPEG bytes (disguised jpeg)", () => {
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const result = validateFileType({
      filename: "photo.png",
      declaredMimeType: "image/png",
      buffer: jpegBytes,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects when extension does not match permitted allowlist", () => {
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const result = validateFileType({
      filename: "payload.exe",
      declaredMimeType: "image/png",
      buffer: pngBytes,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects when declared MIME type does not match detected magic bytes", () => {
    const pdfBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    const result = validateFileType({
      filename: "document.pdf",
      declaredMimeType: "image/png",
      buffer: pdfBytes,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects filename without extension", () => {
    const pdfBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    const result = validateFileType({
      filename: "document",
      declaredMimeType: "application/pdf",
      buffer: pdfBytes,
    });
    expect(result.valid).toBe(false);
  });
});
