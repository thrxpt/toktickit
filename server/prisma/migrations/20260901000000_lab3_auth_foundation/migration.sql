-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "ITPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

-- Evolve Requester to User
ALTER TABLE "Requester" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "Requester_pkey" TO "User_pkey";
ALTER INDEX "Requester_email_key" RENAME TO "User_email_key";

-- Add columns to User with backward-compatible defaults
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
-- Set default bcrypt hash for 'Password123!' (cost 10) for existing rows
UPDATE "User" SET "passwordHash" = '$2b$10$pGc3o90p3SVv6P33HiQru.079bx0VMtFg7y6bH6QSlasrCUBn.Y2m' WHERE "passwordHash" IS NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'REQUESTER';
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex on User
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- AlterTable Ticket
ALTER TABLE "Ticket" ADD COLUMN "ticketOwnerId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "itPriority" "ITPriority";
UPDATE "Ticket" SET "itPriority" = "requestedPriority"::text::"ITPriority" WHERE "itPriority" IS NULL;
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET DEFAULT 'LOW';
ALTER TABLE "Ticket" ADD COLUMN "resolvedByRequester" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey for Ticket ticketOwnerId
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketOwnerId_fkey" FOREIGN KEY ("ticketOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex on Ticket
CREATE INDEX "Ticket_ticketOwnerId_status_idx" ON "Ticket"("ticketOwnerId", "status");
CREATE INDEX "Ticket_itPriority_status_idx" ON "Ticket"("itPriority", "status");

-- CreateTable Comment
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on Comment
CREATE INDEX "Comment_ticketId_createdAt_idx" ON "Comment"("ticketId", "createdAt" ASC);

-- AddForeignKey on Comment
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable InternalNote
CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on InternalNote
CREATE INDEX "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt" ASC);

-- AddForeignKey on InternalNote
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
