-- FR-19: nullable keys preserve all existing rows and legacy callers.
ALTER TABLE "Ticket" ADD COLUMN "submissionKey" TEXT;
CREATE UNIQUE INDEX "Ticket_submissionKey_key" ON "Ticket"("submissionKey");
ALTER TABLE "Comment" ADD COLUMN "submissionKey" TEXT;
CREATE UNIQUE INDEX "Comment_submissionKey_key" ON "Comment"("submissionKey");
ALTER TABLE "InternalNote" ADD COLUMN "submissionKey" TEXT;
CREATE UNIQUE INDEX "InternalNote_submissionKey_key" ON "InternalNote"("submissionKey");
ALTER TABLE "Attachment" ADD COLUMN "submissionKey" TEXT;
CREATE UNIQUE INDEX "Attachment_submissionKey_key" ON "Attachment"("submissionKey");
