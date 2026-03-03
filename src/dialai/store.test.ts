/**
 * Store Conformance Test Suite
 *
 * Parameterized tests that verify any Store implementation
 * behaves correctly. Runs against both memory and Postgres stores.
 */

import { describe, test, expect, beforeEach, afterAll } from "vitest";
import crypto from "node:crypto";
import { createMemoryStore } from "./store-memory.js";
import type { Store } from "./store.js";
import type {
  Session,
  Proposal,
  AlignmentRecord,
  Exemplar,
  DecisionRecord,
  MachineDefinition,
  LlmAuditEntry,
} from "./types.js";

function uuid(): string {
  return crypto.randomUUID();
}

function makeSession(overrides?: Partial<Session>): Session {
  const machine: MachineDefinition = {
    machineName: "test-machine",
    initialState: "a",
    goalState: "b",
    states: {
      a: { prompt: "Go?", transitions: { go: "b" } },
      b: {},
    },
  };
  return {
    sessionId: uuid(),
    machineName: "test-machine",
    currentState: "a",
    currentRoundId: uuid(),
    machine,
    history: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function makeProposal(overrides?: Partial<Proposal>): Proposal {
  return {
    proposalId: uuid(),
    sessionId: uuid(),
    roundId: uuid(),
    specialistId: "spec-1",
    isHuman: false,
    transitionName: "go",
    toState: "b",
    reasoning: "because",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeAlignmentRecord(overrides?: Partial<AlignmentRecord>): AlignmentRecord {
  return {
    specialistId: "spec-1",
    machineName: "test-machine",
    matchingChoices: 3,
    totalComparisons: 5,
    alignmentScore: 0.6,
    lastUpdated: new Date(),
    ...overrides,
  };
}

function runStoreTests(
  name: string,
  createStore: () => Store | Promise<Store>,
  cleanup?: () => Promise<void>
) {
  describe(`Store conformance: ${name}`, () => {
    let store: Store;

    beforeEach(async () => {
      store = await createStore();
      await store.clear();
    });

    afterAll(async () => {
      await cleanup?.();
    });

    // ====================================================================
    // Sessions
    // ====================================================================

    test("getSession returns undefined for missing key", async () => {
      const result = await store.getSession(uuid());
      expect(result).toBeUndefined();
    });

    test("setSession + getSession round-trip", async () => {
      const id = uuid();
      const session = makeSession({ sessionId: id });
      await store.setSession(session);
      const result = await store.getSession(id);
      expect(result).toBeDefined();
      expect(result!.sessionId).toBe(id);
      expect(result!.machineName).toBe("test-machine");
      expect(result!.currentState).toBe("a");
    });

    test("getAllSessions returns all sessions", async () => {
      const id1 = uuid();
      const id2 = uuid();
      await store.setSession(makeSession({ sessionId: id1 }));
      await store.setSession(makeSession({ sessionId: id2 }));
      const all = await store.getAllSessions();
      expect(all).toHaveLength(2);
      const ids = all.map((s) => s.sessionId).sort();
      expect(ids).toEqual([id1, id2].sort());
    });

    test("setSession overwrites existing session", async () => {
      const id = uuid();
      const session = makeSession({ sessionId: id, currentState: "a" });
      await store.setSession(session);
      session.currentState = "b";
      session.history = [{ transitionName: "go", reasoning: "done", executionTimestamp: new Date() }];
      await store.setSession(session);
      const result = await store.getSession(id);
      expect(result!.history).toHaveLength(1);
    });

    // ====================================================================
    // Specialists
    // ====================================================================

    test("getSpecialist returns undefined for missing key", async () => {
      const result = await store.getSpecialist("nonexistent-spec");
      expect(result).toBeUndefined();
    });

    test("hasSpecialist returns false for missing key", async () => {
      expect(await store.hasSpecialist("nonexistent-spec")).toBe(false);
    });

    test("setSpecialist + getSpecialist round-trip", async () => {
      await store.setSpecialist({
        role: "proposer",
        specialistId: "p1",
        machineName: "test-machine",
        isHuman: false,
        strategyFnName: "firstAvailable",
      });
      const result = await store.getSpecialist("p1");
      expect(result).toBeDefined();
      expect(result!.specialistId).toBe("p1");
      expect(result!.role).toBe("proposer");
    });

    test("hasSpecialist returns true after set", async () => {
      await store.setSpecialist({
        role: "arbiter",
        specialistId: "a1",
        machineName: "test-machine",
        strategyFnName: "firstProposal",
      });
      expect(await store.hasSpecialist("a1")).toBe(true);
    });

    test("getSpecialistsByMachineAndRole filters correctly", async () => {
      await store.setSpecialist({
        role: "proposer",
        specialistId: "p1",
        machineName: "m1",
        strategyFnName: "firstAvailable",
      });
      await store.setSpecialist({
        role: "arbiter",
        specialistId: "a1",
        machineName: "m1",
        strategyFnName: "firstProposal",
      });
      await store.setSpecialist({
        role: "proposer",
        specialistId: "p2",
        machineName: "m2",
        strategyFnName: "firstAvailable",
      });

      const m1All = await store.getSpecialistsByMachineAndRole("m1");
      expect(m1All).toHaveLength(2);

      const m1Proposers = await store.getSpecialistsByMachineAndRole("m1", "proposer");
      expect(m1Proposers).toHaveLength(1);
      expect(m1Proposers[0].specialistId).toBe("p1");

      const m2All = await store.getSpecialistsByMachineAndRole("m2");
      expect(m2All).toHaveLength(1);
    });

    // ====================================================================
    // Proposals
    // ====================================================================

    test("getProposal returns undefined for missing key", async () => {
      const result = await store.getProposal(uuid());
      expect(result).toBeUndefined();
    });

    test("setProposal + getProposal round-trip", async () => {
      // Create session first (FK constraint for Postgres)
      const sessionId = uuid();
      await store.setSession(makeSession({ sessionId }));

      const propId = uuid();
      const proposal = makeProposal({ proposalId: propId, sessionId });
      await store.setProposal(proposal);
      const result = await store.getProposal(propId);
      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(propId);
      expect(result!.transitionName).toBe("go");
    });

    test("getProposalsByRound filters correctly", async () => {
      const s1 = uuid(), r1 = uuid(), r2 = uuid(), s2 = uuid();
      // Create sessions first
      await store.setSession(makeSession({ sessionId: s1 }));
      await store.setSession(makeSession({ sessionId: s2 }));

      await store.setProposal(makeProposal({ proposalId: uuid(), sessionId: s1, roundId: r1 }));
      await store.setProposal(makeProposal({ proposalId: uuid(), sessionId: s1, roundId: r1 }));
      await store.setProposal(makeProposal({ proposalId: uuid(), sessionId: s1, roundId: r2 }));
      await store.setProposal(makeProposal({ proposalId: uuid(), sessionId: s2, roundId: r1 }));

      const round1 = await store.getProposalsByRound(s1, r1);
      expect(round1).toHaveLength(2);

      const round2 = await store.getProposalsByRound(s1, r2);
      expect(round2).toHaveLength(1);
    });

    test("deleteProposalsBySession removes all session proposals", async () => {
      const s1 = uuid(), s2 = uuid(), r1 = uuid();
      const p1 = uuid(), p2 = uuid(), p3 = uuid();
      // Create sessions first
      await store.setSession(makeSession({ sessionId: s1 }));
      await store.setSession(makeSession({ sessionId: s2 }));

      await store.setProposal(makeProposal({ proposalId: p1, sessionId: s1, roundId: r1 }));
      await store.setProposal(makeProposal({ proposalId: p2, sessionId: s1, roundId: r1 }));
      await store.setProposal(makeProposal({ proposalId: p3, sessionId: s2, roundId: r1 }));

      await store.deleteProposalsBySession(s1);

      expect(await store.getProposal(p1)).toBeUndefined();
      expect(await store.getProposal(p2)).toBeUndefined();
      expect(await store.getProposal(p3)).toBeDefined();
    });

    // ====================================================================
    // Alignment Records
    // ====================================================================

    test("getAlignmentRecord returns undefined for missing key", async () => {
      const result = await store.getAlignmentRecord("nonexistent");
      expect(result).toBeUndefined();
    });

    test("setAlignmentRecord + getAlignmentRecord round-trip", async () => {
      const record = makeAlignmentRecord();
      await store.setAlignmentRecord("spec-1:test-machine", record);
      const result = await store.getAlignmentRecord("spec-1:test-machine");
      expect(result).toBeDefined();
      expect(result!.specialistId).toBe("spec-1");
      expect(result!.alignmentScore).toBe(0.6);
    });

    test("getAlignmentRecordsByMachine filters by machine", async () => {
      await store.setAlignmentRecord("s1:m1", makeAlignmentRecord({ specialistId: "s1", machineName: "m1" }));
      await store.setAlignmentRecord("s2:m1", makeAlignmentRecord({ specialistId: "s2", machineName: "m1" }));
      await store.setAlignmentRecord("s3:m2", makeAlignmentRecord({ specialistId: "s3", machineName: "m2" }));

      const m1 = await store.getAlignmentRecordsByMachine("m1");
      expect(m1).toHaveLength(2);
    });

    test("getAlignmentRecordsByMachine filters by state", async () => {
      await store.setAlignmentRecord("s1:m1:stateA", makeAlignmentRecord({ specialistId: "s1", machineName: "m1", state: "stateA" }));
      await store.setAlignmentRecord("s2:m1:stateB", makeAlignmentRecord({ specialistId: "s2", machineName: "m1", state: "stateB" }));

      const stateA = await store.getAlignmentRecordsByMachine("m1", "stateA");
      expect(stateA).toHaveLength(1);
      expect(stateA[0].specialistId).toBe("s1");
    });

    // ====================================================================
    // Exemplars
    // ====================================================================

    test("getExemplarsByMachine returns empty for no data", async () => {
      const result = await store.getExemplarsByMachine("nonexistent");
      expect(result).toEqual([]);
    });

    test("setExemplar + getExemplarsByMachine round-trip", async () => {
      const exemplar: Exemplar = {
        exemplarId: uuid(),
        machineName: "m1",
        state: "a",
        context: {
          sessionId: uuid(),
          currentState: "a",
          prompt: "test",
          transitions: { go: "b" },
          history: [],
        },
        humanTransitionName: "go",
        humanToState: "b",
        proposals: [],
        createdAt: new Date(),
      };
      await store.setExemplar(exemplar);
      const result = await store.getExemplarsByMachine("m1");
      expect(result).toHaveLength(1);
      expect(result[0].exemplarId).toBe(exemplar.exemplarId);
    });

    test("getExemplarsByMachine filters by state", async () => {
      const base = {
        context: { sessionId: uuid(), currentState: "a", prompt: "", transitions: {}, history: [] },
        humanTransitionName: "go",
        humanToState: "b",
        proposals: [],
        createdAt: new Date(),
      };
      await store.setExemplar({ ...base, exemplarId: uuid(), machineName: "m1", state: "a" });
      await store.setExemplar({ ...base, exemplarId: uuid(), machineName: "m1", state: "b" });

      const stateA = await store.getExemplarsByMachine("m1", "a");
      expect(stateA).toHaveLength(1);
    });

    // ====================================================================
    // Decision Log
    // ====================================================================

    test("setDecisionRecord + getDecisionRecordsByMachine round-trip", async () => {
      const sessionId = uuid();
      // Need to create the session first for FK constraint in Postgres
      await store.setSession(makeSession({ sessionId }));

      const record: DecisionRecord = {
        decisionId: uuid(),
        sessionId,
        machineName: "test-machine",
        roundId: uuid(),
        fromState: "a",
        toState: "b",
        transitionName: "go",
        isHuman: false,
        proposals: [],
        alignmentSnapshot: {},
        consensusMargin: 0.5,
        threshold: 1,
        timestamp: new Date(),
      };
      await store.setDecisionRecord(record);
      const result = await store.getDecisionRecordsByMachine("test-machine");
      expect(result).toHaveLength(1);
      expect(result[0].machineName).toBe("test-machine");
    });

    test("getDecisionRecordsByMachine respects limit", async () => {
      const sessionId = uuid();
      await store.setSession(makeSession({ sessionId }));

      for (let i = 0; i < 5; i++) {
        await store.setDecisionRecord({
          decisionId: uuid(),
          sessionId,
          machineName: "test-machine",
          roundId: uuid(),
          fromState: "a",
          toState: "b",
          transitionName: "go",
          isHuman: false,
          proposals: [],
          alignmentSnapshot: {},
          consensusMargin: null,
          threshold: 1,
          timestamp: new Date(Date.now() + i),
        });
      }
      const limited = await store.getDecisionRecordsByMachine("test-machine", 3);
      expect(limited).toHaveLength(3);
    });

    // ====================================================================
    // LLM Audit Log
    // ====================================================================

    function makeLlmAuditEntry(overrides?: Partial<LlmAuditEntry>): LlmAuditEntry {
      return {
        auditEntryId: uuid(),
        sessionId: null,
        specialistId: null,
        machineName: null,
        timestamp: new Date(),
        requestUrl: "https://api.example.com/v1/chat/completions",
        requestHeaders: { "Content-Type": "application/json", "Authorization": "[REDACTED]" },
        requestBody: { model: "test-model", messages: [{ role: "user", content: "hello" }] },
        responseStatus: 200,
        responseBody: '{"choices":[{"message":{"content":"hi"}}]}',
        durationMs: 150,
        error: null,
        ...overrides,
      };
    }

    test("appendLlmAuditEntry + getLlmAuditEntries round-trip", async () => {
      const entry = makeLlmAuditEntry({ sessionId: uuid(), specialistId: "spec-1", machineName: "test-machine" });
      await store.appendLlmAuditEntry(entry);
      const entries = await store.getLlmAuditEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].auditEntryId).toBe(entry.auditEntryId);
      expect(entries[0].requestUrl).toBe("https://api.example.com/v1/chat/completions");
      expect(entries[0].requestBody).toEqual(entry.requestBody);
      expect(entries[0].responseBody).toBe(entry.responseBody);
      expect(entries[0].durationMs).toBe(150);
      expect(entries[0].error).toBeNull();
    });

    test("getLlmAuditEntries returns entries in order", async () => {
      const e1 = makeLlmAuditEntry({ timestamp: new Date("2024-01-01T00:00:00Z") });
      const e2 = makeLlmAuditEntry({ timestamp: new Date("2024-01-02T00:00:00Z") });
      const e3 = makeLlmAuditEntry({ timestamp: new Date("2024-01-03T00:00:00Z") });
      await store.appendLlmAuditEntry(e1);
      await store.appendLlmAuditEntry(e2);
      await store.appendLlmAuditEntry(e3);
      const entries = await store.getLlmAuditEntries();
      expect(entries).toHaveLength(3);
    });

    test("getLlmAuditEntries filters by sessionId", async () => {
      const sid = uuid();
      await store.appendLlmAuditEntry(makeLlmAuditEntry({ sessionId: sid }));
      await store.appendLlmAuditEntry(makeLlmAuditEntry({ sessionId: uuid() }));
      await store.appendLlmAuditEntry(makeLlmAuditEntry({ sessionId: null }));

      const filtered = await store.getLlmAuditEntries({ sessionId: sid });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].sessionId).toBe(sid);
    });

    test("getLlmAuditEntries filters by specialistId", async () => {
      await store.appendLlmAuditEntry(makeLlmAuditEntry({ specialistId: "spec-a" }));
      await store.appendLlmAuditEntry(makeLlmAuditEntry({ specialistId: "spec-b" }));

      const filtered = await store.getLlmAuditEntries({ specialistId: "spec-a" });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].specialistId).toBe("spec-a");
    });

    test("getLlmAuditEntries filters by machineName", async () => {
      await store.appendLlmAuditEntry(makeLlmAuditEntry({ machineName: "machine-1" }));
      await store.appendLlmAuditEntry(makeLlmAuditEntry({ machineName: "machine-2" }));

      const filtered = await store.getLlmAuditEntries({ machineName: "machine-1" });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].machineName).toBe("machine-1");
    });

    test("getLlmAuditEntries respects limit", async () => {
      for (let i = 0; i < 5; i++) {
        await store.appendLlmAuditEntry(makeLlmAuditEntry());
      }
      const limited = await store.getLlmAuditEntries({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    test("appendLlmAuditEntry stores error entries", async () => {
      const entry = makeLlmAuditEntry({
        responseStatus: 500,
        responseBody: "Internal Server Error",
        error: "LLM API error (500): Internal Server Error",
      });
      await store.appendLlmAuditEntry(entry);
      const entries = await store.getLlmAuditEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].responseStatus).toBe(500);
      expect(entries[0].error).toBe("LLM API error (500): Internal Server Error");
    });

    test("appendLlmAuditEntry stores network error entries", async () => {
      const entry = makeLlmAuditEntry({
        responseStatus: null,
        responseBody: null,
        error: "fetch failed: ECONNREFUSED",
      });
      await store.appendLlmAuditEntry(entry);
      const entries = await store.getLlmAuditEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].responseStatus).toBeNull();
      expect(entries[0].responseBody).toBeNull();
      expect(entries[0].error).toBe("fetch failed: ECONNREFUSED");
    });

    // ====================================================================
    // Lifecycle
    // ====================================================================

    test("clear removes all data including LLM audit entries", async () => {
      const sessionId = uuid();
      await store.setSession(makeSession({ sessionId }));
      await store.setSpecialist({ role: "proposer", specialistId: "p1", machineName: "m1", strategyFnName: "firstAvailable" });
      await store.setAlignmentRecord("key", makeAlignmentRecord());
      await store.appendLlmAuditEntry(makeLlmAuditEntry());

      await store.clear();

      expect(await store.getSession(sessionId)).toBeUndefined();
      expect(await store.getSpecialist("p1")).toBeUndefined();
      expect(await store.getAlignmentRecord("key")).toBeUndefined();
      expect(await store.getAllSessions()).toEqual([]);
      expect(await store.getLlmAuditEntries()).toEqual([]);
    });
  });
}

// ============================================================================
// Run conformance tests for each store implementation
// ============================================================================

runStoreTests("memory", () => createMemoryStore());

// Only run Postgres tests when POSTGRES_URL is set
if (process.env.POSTGRES_URL) {
  let testDb: { databaseUrl: string; cleanup: () => Promise<void> } | undefined;
  let pgStore: Store | undefined;

  runStoreTests(
    "postgres",
    async () => {
      // Reuse the same store and test DB across all tests
      if (!testDb) {
        const { createTestDatabase } = await import("./test-db.js");
        testDb = await createTestDatabase();
      }
      if (!pgStore) {
        const { createPostgresStore } = await import("./store-postgres.js");
        pgStore = createPostgresStore(testDb.databaseUrl);
      }
      return pgStore;
    },
    async () => {
      await pgStore?.close();
      await testDb?.cleanup();
    }
  );
}
