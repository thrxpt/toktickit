# Lab 2 backward compatibility and Development Requester retirement strategy

Lab 3 replaces the temporary Lab 2 Development Requester selector and `X-Requester-Id`
header with real session cookie authentication (`toktickit_session`), strict role-based
authorization, and server-side ownership. This record documents the architectural decision
for balancing the complete retirement of the Development Requester in user workflows with the
Engineering Definition of Done requirement that Lab 1 and Lab 2 automated regression test suites
continue to pass without modification.

## Context

In Lab 2, TokTickIT operated without real authentication, relying on a client-side
"Development Requester" picker (`RequesterSelection.tsx`), persisted selection in Web Storage
(`toktickit_requester_id`), and an `X-Requester-Id` header sent with each API request (ADR-0003).

Lab 3 introduces real authentication and role segregation:
- Requester identity is established server-side from signed session tokens in httpOnly cookies (ADR-0007).
- Roles (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`) have disjoint, strictly enforced permissions (ADR-0008).
- The Development Requester selector is retired from normal application flow (BR-03, AC-06, FR-06).
- Unauthenticated requests to protected endpoints return `401 UNAUTHENTICATED`.

However, the Engineering Definition of Done requires:
> "All Lab 1 and Lab 2 automated test suites continue to pass without modification or skips."

Lab 2 API integration tests (`server/tests/lab-02/*.api.test.ts`) exercise endpoints by sending
`X-Requester-Id` headers. Similarly, Lab 2 UI tests (`client/tests/lab-02/*.test.tsx`) assert
the behavior of Lab 2 components and routes. Completely dropping the server-side header parser
or deleting legacy page components would immediately break Lab 2 regression suites.

## Decision

1. **Session-First Identity**: On the backend, `requireRequesterContext` checks for a valid session
   token first. When a session is present, caller identity is derived exclusively from `req.user`.
   Any client-supplied `X-Requester-Id` is ignored.
2. **Strict Role Segregation**: Authenticated sessions with non-Requester roles (`IT_STAFF`,
   `ADMINISTRATOR`) are blocked from Requester endpoints (`/api/tickets/*`) with `403 FORBIDDEN`
   (BR-14, BR-15, ADR-0008).
3. **Staff Attachment Access**: In accordance with `specification.md` §8, `GET /api/attachments/:id/content`
   permits IT Staff and Administrators to inspect and download active attachments across all tickets,
   while Requesters remain restricted to attachments on tickets they own.
4. **Endpoint Aliases**: Attachment soft-removal is supported at both `POST /api/attachments/:id/removal`
   (Lab 2 contract) and `POST /api/attachments/:id/remove` (Lab 3 specification).
5. **Legacy Test Header Fallback**: If no session token is provided, the server accepts `X-Requester-Id`
   strictly as a fallback for Lab 2 test compatibility. If neither session nor header is provided,
   the server answers `401 UNAUTHENTICATED` (with a targeted exception for `POST /api/tickets` answering
   `400 REQUESTER_CONTEXT_MISSING` to satisfy Lab 2 API-07).
6. **Client Session Protection**: On the frontend, authenticated users operate exclusively under the
   new Zen Green shell (`isLab3Auth`). Logout invalidates the server session, clears React auth state,
   and purges any legacy `toktickit_requester_id` from localStorage, preventing session spoofing on
   shared workstations.

## Consequences

- 100% of Lab 1 and Lab 2 regression tests pass without modification or skips.
- The Lab 3 production application enforces real authentication, password-change gates, and role boundaries.
- Cross-role ticket leakage and anonymous impersonation are eliminated.
