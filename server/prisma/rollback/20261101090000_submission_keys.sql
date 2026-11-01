-- Stop keyed writes first. Removing keys preserves records but loses retry protection.
ALTER TABLE "Ticket" DROP COLUMN "submissionKey";
ALTER TABLE "Comment" DROP COLUMN "submissionKey";
ALTER TABLE "InternalNote" DROP COLUMN "submissionKey";
ALTER TABLE "Attachment" DROP COLUMN "submissionKey";
