import { readFileSync, readdirSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";

const migrationsRoot = new URL("../../prisma/migrations/", import.meta.url);
const actionMigration = "20261030090000_actions_taken";
afterAll(() => prisma.$disconnect());

describe("API-23 (Issue 24) — AC-21, BR-27 additive migration and reverse", () => {
  it("preserves Lab 3 rows and legacy zero-action Tickets through upgrade and rollback", async () => {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('CREATE SCHEMA "lab4_migration_test"');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO "lab4_migration_test"');
      const executeSql = async (sql: string) => {
        for (const statement of sql.replace(/--[^\n]*/g, "").split(";").filter(s => s.trim())) {
          await tx.$executeRawUnsafe(statement);
        }
      };
      for (const migration of readdirSync(migrationsRoot).filter(name => name < actionMigration).sort()) {
        await executeSql(readFileSync(new URL(`${migration}/migration.sql`, migrationsRoot), "utf8"));
      }
      await tx.$executeRawUnsafe(`INSERT INTO "User" ("name", "email", "passwordHash", "updatedAt") VALUES ('Legacy Requester', 'legacy@example.test', 'unused', NOW())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Category" ("name") VALUES ('Legacy category')`);
      await tx.$executeRawUnsafe(`INSERT INTO "RelatedSystem" ("name") VALUES ('Legacy system')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Ticket" ("ticketNumber", "requesterId", "categoryId", "relatedSystemId", "summary", "description", "requestedPriority", "updatedAt") VALUES ('TKT-2026-000001', 1, 1, 1, 'Legacy Ticket', 'Preserve this row', 'LOW', NOW())`);
      const readLegacy = () => tx.$queryRawUnsafe('SELECT row_to_json(t) AS ticket FROM "Ticket" t');
      const before = await readLegacy();
      await executeSql(readFileSync(new URL(`${actionMigration}/migration.sql`, migrationsRoot), "utf8"));
      expect(await readLegacy()).toEqual(before);
      expect(await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ActionTaken"')).toEqual([{ count: 0 }]);
      // Ordinary actions may share null seed keys, preserving BR-26.
      await tx.$executeRawUnsafe(`INSERT INTO "ActionTaken" ("ticketId", "performedById", "description", "result", "updatedAt") VALUES (1, 1, 'Same description', 'First', NOW()), (1, 1, 'Same description', 'Second', NOW())`);
      await executeSql(readFileSync(new URL("../../prisma/rollback/20261030090000_actions_taken.sql", import.meta.url), "utf8"));
      expect(await readLegacy()).toEqual(before);
      await tx.$executeRawUnsafe('DROP SCHEMA "lab4_migration_test" CASCADE');
    }, { timeout: 15000 });
  });
});
