CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "seedKey" TEXT,
    "ticketId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "performedById" INTEGER NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActionTaken_seedKey_key" ON "ActionTaken"("seedKey");
CREATE INDEX "ActionTaken_ticketId_createdAt_idx" ON "ActionTaken"("ticketId", "createdAt" ASC);
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
