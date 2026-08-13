# The client reaches the API through the Vite dev proxy, not CORS

An Express API on `:3000` and a Vite dev server on `:5173` are different
origins, and the reflex fix is the `cors` package. Instead, `vite.config.ts`
proxies `/api` to `http://localhost:3000`, so the browser only ever talks to its
own origin and the app fetches relative URLs like `/api/health`. This keeps the
dependency list inside the stack the contract locks down, and leaves no
API-base-URL environment variable for the client to get wrong.

If you came here wondering why an Express + React project has no `cors`
dependency: that is why.

## Consequences

The proxy is a dev-server feature. A build served from somewhere other than
Vite — any real deployment — needs this revisited, either by serving the client
from Express or by adding CORS then. Nothing in Lab 1 depends on that.
