import fs from "node:fs";
import path from "node:path";

// Resolves server/uploads/ directory reliably in CommonJS.
export const UPLOADS_DIR =
 process.env.UPLOADS_DIR || path.resolve(__dirname, "../../uploads");

/**
 * Ensures the uploads directory exists on disk.
 */
export function ensureUploadsDir(): void {
 if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
 }
}

/**
 * Gets the filesystem path for a storage key.
 * Storage key is a generated UUID and never a user-controlled path (ADR-0004, BR-37).
 */
export function getStorageFilePath(storageKey: string): string {
 // Ensure no path traversal in storageKey
 const safeKey = path.basename(storageKey);
 return path.join(UPLOADS_DIR, safeKey);
}

/**
 * Writes attachment bytes to disk under the storage key.
 */
export async function writeAttachmentFile(
 storageKey: string,
 buffer: Buffer,
): Promise<void> {
 ensureUploadsDir();
 const filePath = getStorageFilePath(storageKey);
 await fs.promises.writeFile(filePath, buffer);
}

/**
 * Checks if an attachment file exists on disk.
 */
export function attachmentFileExists(storageKey: string): boolean {
 const filePath = getStorageFilePath(storageKey);
 return fs.existsSync(filePath);
}

/**
 * Safely removes an attachment file from disk if present (compensation for failed inserts).
 */
export async function deleteAttachmentFile(storageKey: string): Promise<void> {
 try {
  const filePath = getStorageFilePath(storageKey);
  if (fs.existsSync(filePath)) {
   await fs.promises.unlink(filePath);
  }
 } catch {
  // Non-fatal compensation error: orphaned file is inert (ADR-0004)
 }
}

/**
 * Sanitizes original filename for Content-Disposition header (RFC 6266 / RFC 5987).
 * Strips quotes, backslashes, and control characters; provides filename* for non-ASCII.
 */
export function formatContentDisposition(
 mimeType: string,
 originalFilename: string,
): string {
 const isImage =
  mimeType === "image/jpeg" ||
  mimeType === "image/png" ||
  mimeType === "image/webp";

 const dispositionType = isImage ? "inline" : "attachment";

 // Strip control chars, quotes, backslashes for standard filename="..."
 const asciiFallback = originalFilename
  .replace(/[\x00-\x1F\x7F"\\/]/g, "_")
  .replace(/[^\x20-\x7E]/g, "_");

 const encodedFilename = encodeURIComponent(originalFilename).replace(
  /['()*]/g,
  (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
 );

 return `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`;
}
