// ADR-0007, BR-30: same-origin session cookies are the only identity source.
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  // pi-lens-ignore: ts-ssrf
  return fetch(input, { credentials: "same-origin", ...init });
}

export default apiFetch;
