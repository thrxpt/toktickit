-- BR-21, BR-22: recent dashboard reads order by updatedAt.
CREATE INDEX "Ticket_requesterId_updatedAt_idx" ON "Ticket"("requesterId", "updatedAt" DESC);
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt" DESC);
