# Session token in httpOnly cookie with test Bearer fallback

Lab 3 introduces real authentication. The client must transmit the authenticated
user identity to the API on each request. The decision is how the credential or
token is stored and transported between the React client and Express backend.

## Context

The React frontend and Express backend are served under the same origin in local
development via the Vite dev proxy (`docs/adr/0002-vite-proxy-not-cors.md`), with no
CORS middleware. Storing tokens in `localStorage` or `sessionStorage` leaves them
vulnerable to script-based exfiltration (XSS). Conversely, pure session cookies
can make automated API testing with Supertest slightly more verbose when cookie
jars are required across multiple isolated requests.

## Decision

We use a signed JSON Web Token (or cryptographically signed session token) stored
in an `httpOnly`, `SameSite=Lax`, `Path=/` cookie named `toktickit_session`.
The login endpoint (`POST /api/auth/login`) sets this cookie and also returns the
token string in the response payload. The authentication middleware inspects the
`toktickit_session` cookie first; if absent, it checks the `Authorization: Bearer <token>`
header as a fallback.

Password hashing uses `bcrypt` with an iteration cost factor of 10. Secrets
(`JWT_SECRET` / `SESSION_SECRET`) are read from `server/.env` with local development
fallbacks and are never committed to version control.

## Consequences

The browser handles cookie transmission automatically without requiring client-side
storage of token secrets in JavaScript memory or Web Storage. Automated tests in
Supertest can supply the token directly in the `Authorization` header or through
cookie headers. Invalidation on logout is achieved by clearing the cookie via
`POST /api/auth/logout`.
