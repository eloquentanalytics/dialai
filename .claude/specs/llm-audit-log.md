# LLM Audit Log

## Executive Summary

Add an append-only audit log that captures the full raw request and response for every LLM API call the DIAL framework makes on behalf of a specialist. The log lives alongside existing data in both the PostgreSQL and in-memory stores, and is never updated or deleted through application code.

## Objective

Build an append-only LLM audit log so that every call the framework makes to an external LLM endpoint (via `callLlm` in `llm.ts`) is durably recorded with its full request body, response body, timing, error status, and correlation metadata (session, specialist, machine).

## In Scope

- New `LlmAuditEntry` type in `types.ts`
- New `Store` interface methods: `appendLlmAuditEntry` and `getLlmAuditEntries` (read-only query). No update or delete methods.
- Implementation in `store-memory.ts` (append to array, no delete)
- Implementation in `store-postgres.ts` (INSERT only, no UPDATE/DELETE exposed)
- New migration `002-llm-audit-log.ts` creating the `LlmAuditLog` table
- Instrumentation of `callLlm` in `llm.ts` to write an audit entry after every call (success or failure)
- Threading of contextual identifiers (`sessionId`, `specialistId`, `machineName`) from `api.ts` call sites (`invokeProposerStrategy`) through to `callLlm`
- Redaction of the `Authorization` header value from the logged request (log the header name but replace the value with `[REDACTED]`)
- Unit tests for the new store methods (both memory and postgres)
- Unit test that `callLlm` writes an audit entry on success and on failure
- Integration test confirming audit entries appear after `runSession` with an LLM proposer

## Out of Scope

- Auditing webhook calls (`executeWebhook`, `executeProposerWebhook`). Only direct LLM API calls via `callLlm`.
- UI or API endpoints to query the audit log (future work)
- Log rotation, retention policies, or cleanup jobs
- Modifying the existing `Audit` table or its triggers
- Streaming/SSE response auditing (not currently supported by the framework)

## Assumptions and Constraints

- `callLlm` is the single chokepoint for all LLM API calls in the framework. All LLM-mode proposers ultimately call it.
- The existing `Store` interface is the correct extension point. Both `store-memory.ts` and `store-postgres.ts` must implement the new methods.
- The PostgreSQL `LlmAuditLog` table must enforce append-only at the application level (no `UPDATE`/`DELETE` methods exposed). A database-level `RULE` or `TRIGGER` to prevent `UPDATE`/`DELETE` is optional but recommended.
- The `callLlm` function signature will change to accept an optional context parameter. All existing call sites must be updated.
- Raw response body must be captured before JSON parsing, so the audit log preserves the exact bytes returned by the LLM API.
- The audit entry must be written even when the LLM call fails (HTTP error, network error, parse error). The entry records the error.

## Implementation Plan

### Phase 1: Type and Store Interface

1. Add `LlmAuditEntry` interface to `src/dialai/types.ts`:
   ```ts
   export interface LlmAuditEntry {
     auditEntryId: string;
     sessionId: string | null;
     specialistId: string | null;
     machineName: string | null;
     /** ISO timestamp */
     timestamp: Date;
     /** The full HTTP request body sent to the LLM endpoint */
     requestBody: Record<string, unknown>;
     /** The LLM endpoint URL (without auth params) */
     requestUrl: string;
     /** HTTP request headers (Authorization value redacted) */
     requestHeaders: Record<string, string>;
     /** HTTP status code returned, or null if network error */
     responseStatus: number | null;
     /** The full raw response body as a string */
     responseBody: string | null;
     /** Duration in milliseconds */
     durationMs: number;
     /** Error message if the call failed */
     error: string | null;
   }
   ```

2. Add two methods to the `Store` interface in `src/dialai/store.ts`:
   ```ts
   // LLM Audit Log (append-only)
   appendLlmAuditEntry(entry: LlmAuditEntry): Promise<void>;
   getLlmAuditEntries(filters?: {
     sessionId?: string;
     specialistId?: string;
     machineName?: string;
     limit?: number;
   }): Promise<LlmAuditEntry[]>;
   ```

### Phase 2: Store Implementations

3. Implement in `store-memory.ts`:
   - Add `_llmAuditLog: LlmAuditEntry[]` array.
   - `appendLlmAuditEntry`: push to array.
   - `getLlmAuditEntries`: filter array by optional fields, apply limit.
   - `clear()`: reset the array.

4. Implement in `store-postgres.ts`:
   - Add `LlmAuditLog` table type to the Kysely `Database` interface.
   - `appendLlmAuditEntry`: INSERT into `LlmAuditLog`.
   - `getLlmAuditEntries`: SELECT with optional WHERE clauses and LIMIT.
   - Update `clear()` to include `"LlmAuditLog"` in the TRUNCATE statement.

5. Create migration `src/dialai/migrations/002-llm-audit-log.ts`:
   ```sql
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
     "error"          TEXT,

     CONSTRAINT llm_audit_log_no_update
       CHECK (TRUE)  -- placeholder; real protection via RULE below
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
   ```

6. Update `src/dialai/migrations/migrate.ts` to include the new migration.

### Phase 3: Instrument `callLlm`

7. Add an optional `LlmAuditContext` parameter to `callLlm` in `src/dialai/llm.ts`:
   ```ts
   export interface LlmAuditContext {
     sessionId?: string;
     specialistId?: string;
     machineName?: string;
   }
   ```

8. Modify `callLlm` to:
   - Record `Date.now()` before the fetch
   - Capture the raw response text before parsing JSON
   - After success or on error, call `getStore().appendLlmAuditEntry(...)` with the full details
   - Redact the `Authorization` header value in the logged `requestHeaders`

9. Update call sites that pass context:
   - `executeProposerLlm` in `llm.ts` — receives `ProposerContext` which has `sessionId`. Pass `{ sessionId: ctx.sessionId, specialistId }` (specialistId needs to be threaded through).
   - `executeContextWebhookProposer` in `llm.ts` — same.
   - `invokeProposerStrategy` in `api.ts` — pass `proposer.specialistId` and `proposer.machineName` to the `llm.ts` functions.

   This means:
   - `executeProposerLlm` signature adds a `auditContext?: LlmAuditContext` param
   - `executeContextWebhookProposer` signature adds a `auditContext?: LlmAuditContext` param
   - `invokeProposerStrategy` in `api.ts` constructs the audit context and passes it

### Phase 4: Tests and Verification

10. Unit tests (`tests/unit/llm-audit.test.ts`):
    - `callLlm` writes an audit entry on successful call (mock fetch)
    - `callLlm` writes an audit entry on failed call (mock fetch returning 500)
    - `callLlm` writes an audit entry on network error (mock fetch throwing)
    - Authorization header is redacted in the audit entry
    - `appendLlmAuditEntry` and `getLlmAuditEntries` work correctly on memory store
    - `getLlmAuditEntries` filters by sessionId, specialistId, machineName
    - `getLlmAuditEntries` respects limit

11. Integration test (`tests/integration/llm-audit-postgres.test.ts`):
    - With a PostgreSQL store, run a session with an LLM proposer (mocked LLM endpoint)
    - Verify audit entries are written to the database
    - Verify UPDATE and DELETE are silently blocked by the database rules

12. Run full CI: `npm run ci` (typecheck + lint + test + build)

## Acceptance Criteria

### Functional
- Given a session with an LLM proposer, when a tick solicits a proposal from that proposer, then an `LlmAuditEntry` is appended to the store containing the full request body, request URL, request headers (auth redacted), response status, response body, duration, and correlation fields.
- Given an LLM call that fails with an HTTP error, when the error is caught, then an audit entry is still written with `error` populated and `responseBody`/`responseStatus` reflecting the failed response.
- Given an LLM call that fails with a network error, when the error is caught, then an audit entry is still written with `error` populated and `responseStatus` as null.
- Given multiple audit entries, when `getLlmAuditEntries({ sessionId })` is called, then only entries for that session are returned.
- Given the PostgreSQL store, when an `UPDATE` or `DELETE` is attempted on `LlmAuditLog`, then the operation is silently ignored (no rows modified).

### Quality
- No `any` types introduced.
- All existing tests continue to pass.
- `npm run typecheck` passes with zero errors.
- `npm run lint` passes with zero errors.
- Authorization header value is never stored in the audit log in cleartext.

### Operational
- `npm run build` produces a clean build.
- `npm run ci` passes end to end.
- The migration file is registered and runs without errors on a fresh database.

## Validation and Tests

- Run: `npm run typecheck`
- Run: `npm run lint`
- Run: `npm test`
- Run: `npm run build`
- Run: `npm run ci`
- Verify: all commands exit with code 0

## Failure and Recovery Rules

1. Run tests after each meaningful change (new type, new store method, instrumentation change).
2. If tests fail, inspect the failure and fix the smallest root cause first.
3. If a store method signature change breaks existing tests, update those tests to pass the new required fields.
4. If the migration fails, check SQL syntax and table/column naming against the existing migration for conventions.
5. If blocked after repeated attempts, document the blocker, attempted fixes, and the minimal decision needed from the operator.
6. Do not declare completion while any required acceptance criterion is unmet.
7. Prefer incremental verified progress over broad speculative rewrites.

## Completion Signal

Output exactly `COMPLETE` only when:
- All listed acceptance criteria are met
- `npm run ci` passes
- No blocking errors remain
- The `LlmAuditEntry` type, store methods, migration, instrumentation, and tests are all in place

## Ralph Prompt Draft

```
Implement an append-only LLM audit log for the DIAL framework.

Constraints:
- Follow existing code conventions (ESM, strict TypeScript, no explicit any, camelCase columns)
- The Store interface must be extended, not replaced
- Both memory and postgres store implementations must be updated
- The audit log must be append-only: no UPDATE or DELETE methods
- Authorization header values must be redacted in logged entries
- Audit entries must be written even when LLM calls fail

Required deliverables:
- LlmAuditEntry type in types.ts
- Store interface methods: appendLlmAuditEntry, getLlmAuditEntries
- Memory store implementation
- Postgres store implementation
- Migration 002-llm-audit-log.ts
- Instrumented callLlm in llm.ts
- Updated call sites in api.ts to thread context
- Unit tests for store methods and callLlm audit behavior
- Integration test for postgres audit log

Acceptance criteria:
- Every callLlm invocation writes an LlmAuditEntry to the store
- Failed LLM calls still produce an audit entry with the error recorded
- Authorization header value is redacted in stored entries
- getLlmAuditEntries filters by sessionId, specialistId, machineName, and limit
- PostgreSQL LlmAuditLog table rejects UPDATE and DELETE via RULEs
- npm run ci passes (typecheck + lint + test + build)
- No existing tests broken

Execution rules:
1. Start with types.ts and store.ts changes (Phase 1).
2. Implement both store backends (Phase 2).
3. Instrument callLlm and update call sites (Phase 3).
4. Write tests (Phase 4).
5. After each phase, run npm run typecheck to catch errors early.
6. After all phases, run npm run ci.
7. If blocked after repeated attempts, report the blocker and the smallest needed decision.
8. Do not claim completion until every acceptance criterion is satisfied.

Output exactly `COMPLETE` when all criteria are met.
```

## Open Questions

None. All resolved:

- **TRUNCATE in `clear()`**: Allowed. `store.clear()` truncates `LlmAuditLog` along with other tables. Append-only is enforced at the application level (no UPDATE/DELETE methods) and database level (RULEs), but TRUNCATE is permitted for test teardown.
- **Schema future-proofing**: Minimal LLM-only. No `callType` column. Webhook auditing is out of scope and can get its own table or migration later.
