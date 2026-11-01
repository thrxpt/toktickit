// ADR-0007, BR-30: same-origin session cookies are the only identity source.
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  // pi-lens-ignore: ts-ssrf
  return fetch(input, { credentials: "same-origin", ...init });
}

// Only the server's documented error envelope is safe to show to a user.
// Network/parser exceptions retain the caller's fixed recovery message.
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const error = (body as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const { code, message } = error as Record<string, unknown>;
  return typeof code === "string" && code.length > 0 && typeof message === "string" && message.trim().length > 0
    ? message : fallback;
}

export default apiFetch;
