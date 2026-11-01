-- BR-27: additive default preserves every existing Ticket.
ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
