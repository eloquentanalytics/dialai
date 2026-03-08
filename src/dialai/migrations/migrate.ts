#!/usr/bin/env npx tsx
/**
 * DIAL AI Migration Runner
 *
 * Reads DATABASE_URL, connects via pg, tracks applied migrations
 * in a _migrations table, and runs SQL in a transaction.
 *
 * Usage: npx tsx src/dialai/migrations/migrate.ts
 */

import pg from "pg";
import { sql as migration001 } from "./001-initial-schema.js";
import { sql as migration002 } from "./002-llm-audit-log.js";
import { sql as migration003 } from "./003-llm-audit-resolved-model.js";

interface Migration {
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  { name: "001-initial-schema", sql: migration001 },
  { name: "002-llm-audit-log", sql: migration002 },
  { name: "003-llm-audit-resolved-model", sql: migration003 },
];

async function ensureMigrationsTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      "name"      TEXT PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
  const result = await client.query<{ name: string }>(
    `SELECT "name" FROM "_migrations" ORDER BY "name"`
  );
  return new Set(result.rows.map((r) => r.name));
}

export async function runMigrations(databaseUrl: string): Promise<string[]> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const ran: string[] = [];

    for (const migration of migrations) {
      if (applied.has(migration.name)) {
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO "_migrations" ("name") VALUES ($1)`,
          [migration.name]
        );
        await client.query("COMMIT");
        ran.push(migration.name);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    return ran;
  } finally {
    await client.end();
  }
}

// Allow running directly
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("migrate.ts");

if (isMain) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  runMigrations(databaseUrl)
    .then((ran) => {
      if (ran.length === 0) {
        console.log("All migrations already applied.");
      } else {
        console.log(`Applied ${ran.length} migration(s): ${ran.join(", ")}`);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
