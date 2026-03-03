/**
 * DIAL AI LLM Audit Log Migration
 *
 * Creates an append-only LlmAuditLog table for recording raw LLM
 * request/response data. UPDATE and DELETE are blocked by database RULEs.
 */

export const sql = `
-- ============================================================================
-- LlmAuditLog (append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "LlmAuditLog" (
  "auditEntryId"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId"      UUID,
  "specialistId"   TEXT,
  "machineName"    TEXT,
  "timestamp"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "requestUrl"     TEXT NOT NULL,
  "requestHeaders" JSONB NOT NULL,
  "requestBody"    JSONB NOT NULL,
  "responseStatus" INTEGER,
  "responseBody"   TEXT,
  "durationMs"     DOUBLE PRECISION NOT NULL,
  "error"          TEXT
);

CREATE INDEX IF NOT EXISTS "idx_LlmAuditLog_sessionId"
  ON "LlmAuditLog"("sessionId");
CREATE INDEX IF NOT EXISTS "idx_LlmAuditLog_specialistId"
  ON "LlmAuditLog"("specialistId");
CREATE INDEX IF NOT EXISTS "idx_LlmAuditLog_machineName"
  ON "LlmAuditLog"("machineName");
CREATE INDEX IF NOT EXISTS "idx_LlmAuditLog_timestamp"
  ON "LlmAuditLog"("timestamp");

-- Enforce append-only at database level
CREATE OR REPLACE RULE llm_audit_log_no_update AS
  ON UPDATE TO "LlmAuditLog" DO INSTEAD NOTHING;
CREATE OR REPLACE RULE llm_audit_log_no_delete AS
  ON DELETE TO "LlmAuditLog" DO INSTEAD NOTHING;
`;
