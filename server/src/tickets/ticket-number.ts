// Pure ticket number formatter (BR-11).
// Formats counter and year into 'TKT-<year>-<six digits>'.
// Zero-padding is a minimum width, not a maximum: counters exceeding six digits
// are not truncated (UNIT-02).
export function formatTicketNumber(
  counter: number,
  year: number = new Date().getFullYear(),
): string {
  const padded = String(counter).padStart(6, "0");
  return `TKT-${year}-${padded}`;
}
