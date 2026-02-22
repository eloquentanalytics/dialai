/**
 * DIAL AI Test Database Helper
 *
 * Creates isolated test databases for parallel test execution.
 * Each call to createTestDatabase() creates a fresh database with
 * the schema applied, and returns a cleanup function to drop it.
 */

import pg from "pg";
import { runMigrations } from "./migrations/migrate.js";

const DEFAULT_POSTGRES_URL =
  "postgresql://postgres:postgres@localhost:5432/postgres";

interface TestDatabase {
  databaseUrl: string;
  databaseName: string;
  cleanup: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const postgresUrl = process.env.POSTGRES_URL ?? DEFAULT_POSTGRES_URL;

  // Generate a unique database name
  const suffix = Math.random().toString(36).slice(2, 10);
  const databaseName = `dialai_test_${suffix}`;

  // Connect to the admin database to create the test DB
  const adminClient = new pg.Client({ connectionString: postgresUrl });
  await adminClient.connect();

  try {
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await adminClient.end();
  }

  // Build the connection URL for the test database
  const parsed = new URL(postgresUrl);
  parsed.pathname = `/${databaseName}`;
  const databaseUrl = parsed.toString();

  // Run migrations on the new database
  await runMigrations(databaseUrl);

  const cleanup = async () => {
    // Connect to admin DB and drop the test database
    const dropClient = new pg.Client({ connectionString: postgresUrl });
    await dropClient.connect();
    try {
      // Terminate existing connections
      await dropClient.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()
      `);
      await dropClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    } finally {
      await dropClient.end();
    }
  };

  return { databaseUrl, databaseName, cleanup };
}
