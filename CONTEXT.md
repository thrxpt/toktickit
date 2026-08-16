# TokTickIT

An IT service desk where staff raise requests and support agents work them. The
product is built one vertical slice at a time — each Lab ships a thin path
through every layer rather than a finished layer.

## Language

### Domain

**Request Category**:
A kind of IT request a person can raise — Account and Access, Hardware,
Software, Network. Seeded reference data, not something users create.
_Avoid_: Type, tag, department, ticket category

**System Status**:
The page's verdict on whether the whole Check System flow succeeded, rendered as
**Online** or **Offline**. It is not a mirror of any single endpoint: with the
API up but the database down, System Status reads Offline.
_Avoid_: Health status, server status, API status

**Health**:
What `GET /api/health` reports about the API process itself (`status: "ok"`).
Narrower than System Status — Health knows nothing about the database.
_Avoid_: Status, ping, heartbeat

**Check System**:
The single action the Lab 1 page offers. One button, one question — "is
TokTickIT working?" — answered by System Status plus the Request Categories.
_Avoid_: Refresh, load, test connection

### Process

**Lab**:
One graded unit of work delivering one vertical slice. Lab 1 proves React →
Express → Prisma → PostgreSQL end to end.
_Avoid_: Sprint, milestone, phase

**Issue**:
A numbered unit of work inside a Lab, owning exactly one feature branch and
carrying its own acceptance criteria.
_Avoid_: Task, story, ticket — **ticket** especially, which belongs to the
product's own domain in later Labs

**Contract**:
The specification plus the evidence required to prove it satisfied. An Issue is
done when its acceptance criteria are checked against running code.
_Avoid_: Spec, requirements

**Integration branch**:
A branch that only ever advances through a peer-reviewed PR — `lab1-staging`
and `main`. Feature branches merge into `lab1-staging`; `lab1-staging` merges
into `main`.
_Avoid_: dev, develop, trunk
