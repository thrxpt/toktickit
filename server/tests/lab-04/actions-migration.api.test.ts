import { readFileSync, readdirSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import type { Prisma } from "../../src/generated/prisma/client";
import { prisma } from "../../src/prisma";

const migrationsRoot = new URL("../../prisma/migrations/", import.meta.url);
const actionMigration = "20261030090000_actions_taken";
afterAll(() => prisma.$disconnect());

async function executeSql(tx: Prisma.TransactionClient, sql: string) {
  for (const statement of sql.replace(/--[^\n]*/g, "").split(";").filter(s => s.trim())) {
    await tx.$executeRawUnsafe(statement);
  }
}

describe("API-23 (Issue 24) — AC-21, BR-27 additive migration and reverse", () => {
  it("preserves Lab 3 rows and legacy zero-action Tickets through upgrade and rollback", async () => {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('CREATE SCHEMA "lab4_migration_test"');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO "lab4_migration_test"');

      for (const migration of readdirSync(migrationsRoot).filter(name => name < actionMigration).sort()) {
        await executeSql(tx, readFileSync(new URL(`${migration}/migration.sql`, migrationsRoot), "utf8"));
      }
      await tx.$executeRawUnsafe(`INSERT INTO "User" ("name", "email", "passwordHash", "updatedAt") VALUES ('Legacy Requester', 'legacy@example.test', 'unused', NOW())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Category" ("name") VALUES ('Legacy category')`);
      await tx.$executeRawUnsafe(`INSERT INTO "RelatedSystem" ("name") VALUES ('Legacy system')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Ticket" ("ticketNumber", "requesterId", "categoryId", "relatedSystemId", "summary", "description", "requestedPriority", "updatedAt") VALUES ('TKT-2026-000001', 1, 1, 1, 'Legacy Ticket', 'Preserve this row', 'LOW', NOW())`);
      const readLegacy = () => tx.$queryRawUnsafe('SELECT row_to_json(t) AS ticket FROM "Ticket" t');
      const before = await readLegacy();
      await executeSql(tx, readFileSync(new URL(`${actionMigration}/migration.sql`, migrationsRoot), "utf8"));
      expect(await readLegacy()).toEqual(before);
      expect(await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ActionTaken"')).toEqual([{ count: 0 }]);
      // Ordinary actions may share null seed keys, preserving BR-26.
      await tx.$executeRawUnsafe(`INSERT INTO "ActionTaken" ("ticketId", "performedById", "description", "result", "updatedAt") VALUES (1, 1, 'Same description', 'First', NOW()), (1, 1, 'Same description', 'Second', NOW())`);
      await executeSql(tx, readFileSync(new URL("../../prisma/rollback/20261030090000_actions_taken.sql", import.meta.url), "utf8"));
      expect(await readLegacy()).toEqual(before);
      await tx.$executeRawUnsafe('DROP SCHEMA "lab4_migration_test" CASCADE');
    }, { timeout: 15000 });
  });
});

describe("API-23, API-29 — FR-19, AC-21: submission-key upgrade and rollback", () => {
  it("preserves legacy Ticket, Comment, Internal Note and Attachment rows", async () => {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('CREATE SCHEMA "submission_migration_test"');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO "submission_migration_test"');
      const migration = "20261101090000_submission_keys";
      for (const name of readdirSync(migrationsRoot).filter(name => name < migration).sort()) {
        await executeSql(tx, readFileSync(new URL(`${name}/migration.sql`, migrationsRoot), "utf8"));
      }
      await tx.$executeRawUnsafe(`INSERT INTO "User" ("name", "email", "passwordHash", "updatedAt") VALUES ('Legacy', 'legacy@example.test', 'unused', NOW())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Category" ("name") VALUES ('Legacy category')`);
      await tx.$executeRawUnsafe(`INSERT INTO "RelatedSystem" ("name") VALUES ('Legacy system')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Ticket" ("ticketNumber", "requesterId", "categoryId", "relatedSystemId", "summary", "description", "requestedPriority", "updatedAt") VALUES ('TKT-2026-000001', 1, 1, 1, 'Legacy Ticket', 'Preserve this row', 'LOW', NOW())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Comment" ("ticketId", "authorId", "content") VALUES (1, 1, 'Legacy comment')`);
      await tx.$executeRawUnsafe(`INSERT INTO "InternalNote" ("ticketId", "authorId", "content") VALUES (1, 1, 'Legacy note')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Attachment" ("ticketId", "uploadedById", "originalFilename", "mimeType", "sizeBytes", "storageKey") VALUES (1, 1, 'legacy.pdf', 'application/pdf', 32, 'legacy-file')`);
      const tables = ["Ticket", "Comment", "InternalNote", "Attachment"];
      const read = () => Promise.all(tables.map(table => tx.$queryRawUnsafe(`SELECT to_jsonb(t) - 'submissionKey' AS row FROM "${table}" t`)));
      const before = await read();
      await executeSql(tx, readFileSync(new URL(`${migration}/migration.sql`, migrationsRoot), "utf8"));
      expect(await read()).toEqual(before);
      for (const table of tables) {
        expect(await tx.$queryRawUnsafe(`SELECT "submissionKey" FROM "${table}"`)).toEqual([{ submissionKey: null }]);
      }
      await executeSql(tx, readFileSync(new URL(`../../prisma/rollback/${migration}.sql`, import.meta.url), "utf8"));
      expect(await read()).toEqual(before);
      await tx.$executeRawUnsafe('DROP SCHEMA "submission_migration_test" CASCADE');
    }, { timeout: 15000 });
  });
});
