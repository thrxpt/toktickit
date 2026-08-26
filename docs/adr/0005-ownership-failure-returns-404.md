# Requesting another Requester's Ticket returns 404, not 403

When the selected Requester asks for a Ticket or Attachment they do not own, the
API answers `404` with the same body a genuinely non-existent id would produce.
The obvious answer is `403 Forbidden`, and it is the wrong one: 403 confirms the
resource exists, which turns `/api/tickets/1..1000` into a working
ticket-enumeration oracle for a caller whose identity is an unverified header.

404 costs nothing here because a Requester has no legitimate reason to
distinguish "someone else's ticket" from "no such ticket" — both mean "not
yours to see."

## Consequences

Server logs, not status codes, are where an ownership failure is distinguishable
from a missing row; the two cases are logged separately even though they answer
identically. If a later Lab introduces sharing — a Requester deliberately
granting visibility to a colleague — that flow needs its own 403, because at
that point "exists but not yours" becomes information the user is entitled to.
