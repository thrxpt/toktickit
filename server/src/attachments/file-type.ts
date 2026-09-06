// Pure magic-byte detection and three-way agreement validation (BR-32, BR-33).
// No external dependencies: four signatures are a short table (specification.md §11, D-10).

export type PermittedMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf";

export const PERMITTED_EXTENSIONS_MAP = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
} satisfies Record<PermittedMimeType, string[]>;

export const ALLOWED_MIME_TYPES = Object.keys(
  PERMITTED_EXTENSIONS_MAP,
) as PermittedMimeType[];

/**
 * Detect file type strictly from magic byte signatures.
 * Returns null if the byte pattern does not match any permitted type.
 */
export function detectFileType(buffer: Buffer): PermittedMimeType | null {
  if (!buffer || buffer.length < 3) {
    return null;
  }

  // JPEG: FF D8 FF at offset 0
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A at offset 0 (8 bytes)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: RIFF at offset 0 (4 bytes) AND WEBP at offset 8 (4 bytes)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // 'R'
    buffer[1] === 0x49 && // 'I'
    buffer[2] === 0x46 && // 'F'
    buffer[3] === 0x46 && // 'F'
    buffer[8] === 0x57 && // 'W'
    buffer[9] === 0x45 && // 'E'
    buffer[10] === 0x42 && // 'B'
    buffer[11] === 0x50 // 'P'
  ) {
    return "image/webp";
  }

  // PDF: %PDF (25 50 44 46) at offset 0 (4 bytes)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 && // '%'
    buffer[1] === 0x50 && // 'P'
    buffer[2] === 0x44 && // 'D'
    buffer[3] === 0x46 // 'F'
  ) {
    return "application/pdf";
  }

  return null;
}

/**
 * Three-way validation:
 * 1. Filename extension is in allowlist for a permitted type.
 * 2. Declared MIME type is in allowlist and matches extension.
 * 3. Magic bytes match the detected type and agree with declared MIME.
 *
 * All three must agree (BR-33). Any disagreement is invalid.
 */
export function validateFileType({
  filename,
  declaredMimeType,
  buffer,
}: {
  filename: string;
  declaredMimeType: string;
  buffer: Buffer;
}): { valid: boolean; mimeType?: PermittedMimeType } {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return { valid: false };
  }

  const extension = filename.slice(dotIndex).toLowerCase();
  const normalizedMime = declaredMimeType.toLowerCase() as PermittedMimeType;

  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return { valid: false };
  }

  const validExtensions = PERMITTED_EXTENSIONS_MAP[normalizedMime];
  if (!validExtensions || !validExtensions.includes(extension)) {
    return { valid: false };
  }

  const detectedMime = detectFileType(buffer);
  if (!detectedMime || detectedMime !== normalizedMime) {
    return { valid: false };
  }

  return { valid: true, mimeType: detectedMime };
}
