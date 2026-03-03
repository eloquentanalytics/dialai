/**
 * LLM Audit Log PostgreSQL Integration Tests
 *
 * Tests that the LlmAuditLog table exists, accepts inserts,
 * and blocks UPDATE/DELETE via database rules.
 * Skips if POSTGRES_URL is not set.
 */

import { describe, test, expect, afterAll, beforeAll } from "vitest";
import pg from "pg";
import crypto from "node:crypto";
import { createTestDatabase } from "../../src/dialai/test-db.js";
import type { Store } from "../../src/dialai/store.js";
import type { LlmAuditEntry } from "../../src/dialai/types.js";

const SKIP = !process.env.POSTGRES_URL;

function uuid(): string {
  return crypto.randomUUID();
}

function makeLlmAuditEntry(overrides?: Partial<LlmAuditEntry>): LlmAuditEntry {
  return {
    auditEntryId: uuid(),
    sessionId: null,
    specialistId: null,
    machineName: null,
    timestamp: new Date(),
    requestUrl: "https://api.example.com/v1/chat/completions",
    requestHeaders: { "Content-Type": "application/json", "Authorization": "[REDACTED]" },
    requestBody: { model: "test-model", messages: [] },
    responseStatus: 200,
    responseBody: '{"choices":[]}',
    durationMs: 100,
    error: null,
    ...overrides,
  };
}

describe.skipIf(SKIP)("LLM Audit Log: PostgreSQL", () => {
  let databaseUrl: string;
  let cleanup: () => Promise<void>;
  let store: Store;

  beforeAll(async () => {
    const testDb = await createTestDatabase();
    databaseUrl = testDb.databaseUrl;
    cleanup = testDb.cleanup;

    const { createPostgresStore } = await import("../../src/dialai/store-postgres.js");
    store = createPostgresStore(databaseUrl);
  });

  afterAll(async () => {
    await store?.close();
    await cleanup?.();
  });

  test("LlmAuditLog table exists after migration", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'LlmAuditLog'`
      );
      expect(result.rows).toHaveLength(1);
    } finally {
      await client.end();
    }
  });

  test("LlmAuditLog table has correct columns", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'LlmAuditLog' AND table_schema = 'public'
         ORDER BY ordinal_position`
      );
      const cols = result.rows.map((r) => r.column_name);
      expect(cols).toEqual([
        "auditEntryId",
        "sessionId",
        "specialistId",
        "machineName",
        "timestamp",
        "requestUrl",
        "requestHeaders",
        "requestBody",
        "responseStatus",
        "responseBody",
        "durationMs",
        "error",
      ]);
    } finally {
      await client.end();
    }
  });

  test("appendLlmAuditEntry inserts a row", async () => {
    const entry = makeLlmAuditEntry({
      sessionId: uuid(),
      specialistId: "spec-pg-1",
      machineName: "pg-machine",
    });
    await store.appendLlmAuditEntry(entry);

    const entries = await store.getLlmAuditEntries({ specialistId: "spec-pg-1" });
    expect(entries).toHaveLength(1);
    expect(entries[0].auditEntryId).toBe(entry.auditEntryId);
    expect(entries[0].requestBody).toEqual(entry.requestBody);
  });

  test("UPDATE on LlmAuditLog is silently ignored", async () => {
    const entry = makeLlmAuditEntry({ specialistId: "spec-no-update" });
    await store.appendLlmAuditEntry(entry);

    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      // Attempt to update - should be silently ignored by RULE
      await client.query(
        `UPDATE "LlmAuditLog" SET "error" = 'hacked' WHERE "auditEntryId" = $1`,
        [entry.auditEntryId]
      );

      // Verify the row was NOT modified
      const result = await client.query<{ error: string | null }>(
        `SELECT "error" FROM "LlmAuditLog" WHERE "auditEntryId" = $1`,
        [entry.auditEntryId]
      );
      expect(result.rows[0].error).toBeNull();
    } finally {
      await client.end();
    }
  });

  test("DELETE on LlmAuditLog is silently ignored", async () => {
    const entry = makeLlmAuditEntry({ specialistId: "spec-no-delete" });
    await store.appendLlmAuditEntry(entry);

    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      // Attempt to delete - should be silently ignored by RULE
      await client.query(
        `DELETE FROM "LlmAuditLog" WHERE "auditEntryId" = $1`,
        [entry.auditEntryId]
      );

      // Verify the row still exists
      const result = await client.query<{ auditEntryId: string }>(
        `SELECT "auditEntryId" FROM "LlmAuditLog" WHERE "auditEntryId" = $1`,
        [entry.auditEntryId]
      );
      expect(result.rows).toHaveLength(1);
    } finally {
      await client.end();
    }
  });

  test("TRUNCATE still works for clear()", async () => {
    await store.appendLlmAuditEntry(makeLlmAuditEntry());
    await store.appendLlmAuditEntry(makeLlmAuditEntry());

    const before = await store.getLlmAuditEntries();
    expect(before.length).toBeGreaterThanOrEqual(2);

    await store.clear();

    const after = await store.getLlmAuditEntries();
    expect(after).toHaveLength(0);
  });
});
