import { STORAGE_KEY } from '../context/RequesterContext'

// Centralized fetch wrapper attaching X-Requester-Id from the active context
// to every /api/... call that needs it (ADR-0003, BR-04).
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)

  const requesterId = localStorage.getItem(STORAGE_KEY)
  if (requesterId && !headers.has('X-Requester-Id')) {
    headers.set('X-Requester-Id', requesterId)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}

export default apiFetch
