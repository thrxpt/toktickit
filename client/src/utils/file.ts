export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(bytes % 1024 === 0 ? 0 : 1);
    return `${kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(
    bytes % (1024 * 1024) === 0 ? 0 : 1,
  );
  return `${mb} MB`;
}

export const PERMITTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function isPermittedFileType(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasValidExt = PERMITTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const validMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  const hasValidMime =
    !file.type || validMimes.includes(file.type.toLowerCase());
  return hasValidExt && hasValidMime;
}

export function isImageAttachment(mimeType: string, filename: string): boolean {
  const mime = mimeType.toLowerCase();
  const name = filename.toLowerCase();
  const isImageMime =
    mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
  const isImageExt =
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp");
  return isImageMime || (!mime && isImageExt);
}
