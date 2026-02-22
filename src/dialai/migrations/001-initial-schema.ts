/**
 * DIAL AI Initial Database Schema
 *
 * 5 data tables (Machine, Session, Specialist, Round, Proposal) + Audit.
 * All column names camelCase. Indexes on filter columns.
 */

export const sql = `
-- ============================================================================
-- Machine
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Machine" (
  "machineName"        TEXT PRIMARY KEY,
  "initialState"       TEXT NOT NULL,
  "goalState"          TEXT NOT NULL,
  "states"             JSONB NOT NULL,
  "specialists"        JSONB,
  "consensusThreshold" DOUBLE PRECISION,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Session
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Session" (
  "sessionId"   UUID PRIMARY KEY,
  "machineName" TEXT NOT NULL REFERENCES "Machine"("machineName"),
  "machine"     JSONB NOT NULL,
  "history"     JSONB NOT NULL DEFAULT '[]',
  "metaJson"    JSONB,
  "status"      TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'completed')),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_Session_machineName" ON "Session"("machineName");
CREATE INDEX IF NOT EXISTS "idx_Session_status" ON "Session"("status");

-- ============================================================================
-- Specialist
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Specialist" (
  "specialistId" TEXT PRIMARY KEY,
  "role"         TEXT NOT NULL CHECK ("role" IN ('proposer', 'arbiter')),
  "machineName"  TEXT NOT NULL,
  "isHuman"      BOOLEAN NOT NULL DEFAULT FALSE,
  "enabled"      BOOLEAN NOT NULL DEFAULT TRUE,
  "config"       JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS "idx_Specialist_machineName" ON "Specialist"("machineName");
CREATE INDEX IF NOT EXISTS "idx_Specialist_role" ON "Specialist"("role");

-- ============================================================================
-- Round
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Round" (
  "roundId"            UUID PRIMARY KEY,
  "sessionId"          UUID NOT NULL REFERENCES "Session"("sessionId"),
  "state"              TEXT NOT NULL,
  "startedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt"        TIMESTAMPTZ,
  "toState"            TEXT,
  "transitionName"     TEXT,
  "reasoning"          TEXT,
  "isHuman"            BOOLEAN,
  "alignmentSnapshot"  JSONB,
  "consensusMargin"    DOUBLE PRECISION,
  "threshold"          DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS "idx_Round_sessionId" ON "Round"("sessionId");

-- ============================================================================
-- Proposal
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Proposal" (
  "proposalId"      UUID PRIMARY KEY,
  "sessionId"       UUID NOT NULL REFERENCES "Session"("sessionId"),
  "roundId"         UUID NOT NULL REFERENCES "Round"("roundId"),
  "specialistId"    TEXT NOT NULL,
  "isHuman"         BOOLEAN NOT NULL DEFAULT FALSE,
  "transitionName"  TEXT NOT NULL,
  "toState"         TEXT NOT NULL,
  "reasoning"       TEXT NOT NULL DEFAULT '',
  "metaJson"        JSONB,
  "costUSD"         DOUBLE PRECISION,
  "latencyMsec"     DOUBLE PRECISION,
  "numInputTokens"  INTEGER,
  "numOutputTokens" INTEGER,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_Proposal_sessionId" ON "Proposal"("sessionId");
CREATE INDEX IF NOT EXISTS "idx_Proposal_roundId" ON "Proposal"("roundId");
CREATE INDEX IF NOT EXISTS "idx_Proposal_specialistId" ON "Proposal"("specialistId");

-- ============================================================================
-- Audit
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Audit" (
  "auditId"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tableName" TEXT NOT NULL,
  "recordId"  TEXT NOT NULL,
  "operation" TEXT NOT NULL CHECK ("operation" IN ('INSERT', 'UPDATE', 'DELETE')),
  "oldValue"  JSONB,
  "newValue"  JSONB,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_Audit_tableName" ON "Audit"("tableName");
CREATE INDEX IF NOT EXISTS "idx_Audit_recordId" ON "Audit"("recordId");

-- ============================================================================
-- Audit trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  pk_col TEXT;
  pk_val TEXT;
BEGIN
  -- Determine the primary key column name based on the table
  CASE TG_TABLE_NAME
    WHEN 'Machine' THEN pk_col := 'machineName';
    WHEN 'Session' THEN pk_col := 'sessionId';
    WHEN 'Specialist' THEN pk_col := 'specialistId';
    WHEN 'Round' THEN pk_col := 'roundId';
    WHEN 'Proposal' THEN pk_col := 'proposalId';
    ELSE pk_col := 'id';
  END CASE;

  IF TG_OP = 'INSERT' THEN
    EXECUTE format('SELECT ($1.%I)::TEXT', pk_col) INTO pk_val USING NEW;
    INSERT INTO "Audit" ("tableName", "recordId", "operation", "newValue")
    VALUES (TG_TABLE_NAME, pk_val, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    EXECUTE format('SELECT ($1.%I)::TEXT', pk_col) INTO pk_val USING NEW;
    INSERT INTO "Audit" ("tableName", "recordId", "operation", "oldValue", "newValue")
    VALUES (TG_TABLE_NAME, pk_val, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    EXECUTE format('SELECT ($1.%I)::TEXT', pk_col) INTO pk_val USING OLD;
    INSERT INTO "Audit" ("tableName", "recordId", "operation", "oldValue")
    VALUES (TG_TABLE_NAME, pk_val, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Attach audit triggers to all 5 data tables
-- ============================================================================
CREATE OR REPLACE TRIGGER audit_Machine
  AFTER INSERT OR UPDATE OR DELETE ON "Machine"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_Session
  AFTER INSERT OR UPDATE OR DELETE ON "Session"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_Specialist
  AFTER INSERT OR UPDATE OR DELETE ON "Specialist"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_Round
  AFTER INSERT OR UPDATE OR DELETE ON "Round"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE TRIGGER audit_Proposal
  AFTER INSERT OR UPDATE OR DELETE ON "Proposal"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
`;
