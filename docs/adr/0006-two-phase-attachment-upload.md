# A Ticket is created first, then its Attachments are uploaded one by one

Create Ticket posts JSON to `POST /api/tickets`, and each selected file is then
uploaded separately to `POST /api/tickets/:ticketId/attachments`. The
alternative — one multipart request carrying the Ticket and its files, committed
atomically — was rejected.

Two reasons. Adding an Attachment to an existing Ticket is required Lab-2 scope
regardless, so the two-phase design has one upload path where the atomic design
would have two that must stay behaviourally identical. And atomicity here is
actively user-hostile: it discards a valid, carefully written Ticket because one
6 MB screenshot exceeded the limit.

The compensation strategy follows from that: the Ticket is created and its
official Ticket Number is displayed, then each file reports its own outcome.
Failures are named per file on the success screen, and the Requester retries
them from Ticket Detail.

## Consequences

A Ticket can exist with fewer Attachments than the Requester intended, and no
transaction hides that — so the success screen must state per-file results
plainly rather than showing a single green tick. In exchange, no partial write
is ever left behind: each upload is independently atomic, and a failed one
leaves neither a row nor a file.
