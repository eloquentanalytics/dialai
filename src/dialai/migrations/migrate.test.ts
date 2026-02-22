/**
 * Migration Test
 *
 * Verifies the database schema is correctly applied.
 * Skips if POSTGRES_URL is not set.
 */

import { describe, test, expect, afterAll, beforeAll } from "vitest";
import pg from "pg";
import { createTestDatabase } from "../test-db.js";

const SKIP = !process.env.POSTGRES_URL;

describe.skipIf(SKIP)("Migration: 001-initial-schema", () => {
  let databaseUrl: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const testDb = await createTestDatabase();
    databaseUrl = testDb.databaseUrl;
    cleanup = testDb.cleanup;
  });

  afterAll(async () => {
    await cleanup?.();
  });

  test("creates all 6 tables", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
      );
      const tables = result.rows.map((r) => r.tablename);
      expect(tables).toContain("Machine");
      expect(tables).toContain("Session");
      expect(tables).toContain("Specialist");
      expect(tables).toContain("Round");
      expect(tables).toContain("Proposal");
      expect(tables).toContain("Audit");
      expect(tables).toContain("_migrations");
    } finally {
      await client.end();
    }
  });

  test("Machine table has correct columns", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'Machine' AND table_schema = 'public'
         ORDER BY ordinal_position`
      );
      const cols = result.rows.map((r) => r.column_name);
      expect(cols).toEqual([
        "machineName",
        "initialState",
        "goalState",
        "states",
        "specialists",
        "consensusThreshold",
        "createdAt",
        "updatedAt",
      ]);
    } finally {
      await client.end();
    }
  });

  test("Session table has correct columns", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'Session' AND table_schema = 'public'
         ORDER BY ordinal_position`
      );
      const cols = result.rows.map((r) => r.column_name);
      expect(cols).toEqual([
        "sessionId",
        "machineName",
        "machine",
        "history",
        "metaJson",
        "status",
        "createdAt",
        "completedAt",
      ]);
    } finally {
      await client.end();
    }
  });

  test("audit trigger fires on INSERT", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      // Insert a Machine row
      await client.query(
        `INSERT INTO "Machine" ("machineName", "initialState", "goalState", "states")
         VALUES ($1, $2, $3, $4)`,
        ["test-machine", "a", "b", JSON.stringify({ a: {}, b: {} })]
      );

      // Check audit
      const audit = await client.query<{ operation: string; tableName: string }>(
        `SELECT "operation", "tableName" FROM "Audit" WHERE "tableName" = 'Machine' AND "recordId" = 'test-machine'`
      );
      expect(audit.rows).toHaveLength(1);
      expect(audit.rows[0].operation).toBe("INSERT");
    } finally {
      await client.end();
    }
  });

  test("audit trigger fires on UPDATE", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      // Update the Machine row
      await client.query(
        `UPDATE "Machine" SET "goalState" = 'c' WHERE "machineName" = 'test-machine'`
      );

      const audit = await client.query<{ operation: string }>(
        `SELECT "operation" FROM "Audit" WHERE "tableName" = 'Machine' AND "operation" = 'UPDATE'`
      );
      expect(audit.rows.length).toBeGreaterThanOrEqual(1);
    } finally {
      await client.end();
    }
  });

  test("audit trigger fires on DELETE", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query(
        `DELETE FROM "Machine" WHERE "machineName" = 'test-machine'`
      );

      const audit = await client.query<{ operation: string }>(
        `SELECT "operation" FROM "Audit" WHERE "tableName" = 'Machine' AND "operation" = 'DELETE'`
      );
      expect(audit.rows.length).toBeGreaterThanOrEqual(1);
    } finally {
      await client.end();
    }
  });
});
