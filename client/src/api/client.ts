// Centralized fetch wrapper passing same-origin credentials (cookies)
// to every /api/... call (ADR-0007), while retaining backward compatibility
// with Lab 2 X-Requester-Id test suites.
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)

  const requesterId = localStorage.getItem('toktickit_requester_id')
  if (requesterId && !headers.has('X-Requester-Id')) {
    headers.set('X-Requester-Id', requesterId)
  }

  // pi-lens-ignore: ts-ssrf
  return fetch(input, {
    credentials: 'same-origin',
    ...init,
    headers,
  })
}

export default apiFetch
