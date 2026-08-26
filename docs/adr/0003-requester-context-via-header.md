# The selected Requester travels in a header, not the request body

Lab 2 has no authentication, so the client must tell the API which Requester it
is acting as. The handout's illustrative JSON puts `requesterId` in the
`POST /api/tickets` body; we send `X-Requester-Id` on every request instead, and
reject a `requesterId` found in a request body rather than honouring it.

Identity in the body means each route parses, trusts, and re-validates the
caller's self-assertion, scattered across ten endpoints. In a header it is
resolved once by middleware into `req.requesterId`, and every ownership check
reads that one value. Lab 3 then replaces the middleware's body — decode a JWT
instead of reading a header — and not a single route or query changes. Putting
identity in the payload would build exactly the shape Lab 3 has to unpick.

## Consequences

The header is trivially spoofable, and that is fine and expected: it is a
testing mechanism, not authentication (see **Development Requester** in
`CONTEXT.md`). What matters is that the ownership *checks* are real and
server-side, so they keep working unchanged once the identity behind them
becomes trustworthy.
