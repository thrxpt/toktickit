# Administrator and IT Staff role segregation

Lab 3 introduces three roles: Requester, IT Staff, and Administrator. The
architecture must decide whether Administrators inherit operational ticket-handling
capabilities (queue browsing, claiming tickets, setting IT Priority) or remain
strictly bounded to user administration.

## Context

Handout §4.3 specifies that Administrator and IT Staff responsibilities should
remain conceptually separate: "IT Staff manage Tickets. Administrators manage user
accounts. An Administrator does not automatically need to perform IT Staff Ticket
operations unless the approved authorization matrix explicitly permits it."

Conflating administration and operational support creates role-bloat, violates the
principle of least privilege, and complicates UI navigation and queue ownership.

## Decision

Administrators and IT Staff have disjoint permissions:

1. **Administrator**: Permitted only on `/api/admin/*` routes (listing, creating,
   editing users, activating/deactivating, resetting initial passwords) and viewing
   shared public comments / internal notes when inspecting tickets. Administrators
   cannot claim ticket ownership, change IT Priority, or operate the IT Staff Ticket
   Queue.
2. **IT Staff**: Permitted on `/api/staff/*` ticket queue and operational routes,
   ticket ownership assignment, IT Priority updates, status transitions, and internal
   notes. IT Staff have no access to `/api/admin/*` user management routes.
3. **Requester**: Permitted only on owned ticket routes (`/api/tickets/*`) and
   public comments. No access to `/api/staff/*` or `/api/admin/*`.

Attempting an action outside one's role returns `403 Forbidden` (or `404 Not Found`
for resource endpoints where existence must not be leaked).

## Consequences

Each role receives a dedicated top-level navigation destination and application view:
IT Staff see **Queue** and **Ticket Detail**, Administrators see **Users**, and
Requesters see **My Tickets** and **Create Ticket**. No role has unnecessary write
privileges outside its domain.
