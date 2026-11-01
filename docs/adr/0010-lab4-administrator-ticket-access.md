# Lab 4: Administrators may perform IT Staff ticket operations

Lab 3's ADR-0008 separated Administrators (user management only) from IT Staff
(ticket operations only). The Lab 4 handout (§4.3) requires the opposite for
Administrators: they must be able to "perform IT Staff behavior and retain
administrative access needed for support and testing", and the Administrator
dashboard "may reuse the IT Staff dashboard". The architecture must decide whether
that supersedes ADR-0008.

## Context

Lab 4 adds Actions Taken to Tickets. To record an action, a user must be able to
reach Ticket Detail; to support that workflow and test it end to end, an
Administrator needs the queue and the whole ticket operation set, not a special
narrower path. The handout's authorization table marks Administrator as performing
IT Staff behavior, and its dashboard rules explicitly allow reusing the Staff
dashboard.

Keeping ADR-0008's absolute segregation would make the handout's Administrator
requirement unimplementable, or force a second parallel implementation of ticket
operations for Administrators — duplicating routes, guards, and UI for no user
benefit.

## Decision

Administrators may use the IT Staff ticket surfaces, and only in that direction:

1. **Administrator**: may read the Ticket Queue and Ticket Detail, claim and reassign
   Tickets, update IT Priority, perform permitted status transitions, post Public
   Comments and Internal Notes, create and update Actions Taken, and read the IT Staff
   dashboard (which adds account counts for Administrators). User Management is
   unchanged.
2. **IT Staff**: no access to `/api/admin/*`. Nothing in this ADR widens IT Staff.
3. **Requester**: unchanged. Requester routes and Actions Taken reads stay
   ownership-scoped.

Every widened route is enforced by `requireRole("IT_STAFF", "ADMINISTRATOR")` on the
server; the UI merely reflects what the server allows (BR-29).

## Consequences

- `/api/staff/*` guards accept both operational roles; the Lab 3 test that asserted
  Administrator → 403 on `/api/staff/*` is replaced by one asserting the permitted
  behavior (tests.md API-13), while IT Staff → 403 on `/api/admin/*` remains (API-14).
- Administrator navigation becomes Dashboard, Ticket Queue, Users.
- ADR-0008 remains authoritative for everything else: disjoint role assignment,
  single role per user, and IT Staff exclusion from User Management. This ADR
  supersedes only its "Administrators cannot claim ticket ownership, change IT
  Priority, or operate the IT Staff Ticket Queue" clause.
