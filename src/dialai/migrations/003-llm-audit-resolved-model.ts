/**
 * DIAL AI Migration: Add resolvedModel to LlmAuditLog
 *
 * Adds a column to capture the pinned model ID returned by the API,
 * which may differ from the alias sent in the request.
 */

export const sql = `
ALTER TABLE "LlmAuditLog"
  ADD COLUMN IF NOT EXISTS "resolvedModel" TEXT;
`;
