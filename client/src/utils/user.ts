export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  if (!first) {
    return "";
  }
  const last = parts.at(-1);
  if (!last || parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}
