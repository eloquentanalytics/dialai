/**
 * DIAL AI PostgreSQL Store
 *
 * Implements the Store interface using Kysely against the 5+1 table schema.
 * Maps the 6-Map model to the consolidated database schema.
 */

import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { Store } from "./store.js";
import type {
  Session,
  Specialist,
  Arbiter,
  Proposal,
  AlignmentRecord,
  Exemplar,
  DecisionRecord,
} from "./types.js";

// ============================================================================
// Kysely Database Type Definitions
// ============================================================================

interface MachineTable {
  machineName: string;
  initialState: string;
  goalState: string;
  states: unknown;
  specialists: unknown;
  consensusThreshold: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionTable {
  sessionId: string;
  machineName: string;
  machine: unknown;
  history: unknown;
  metaJson: unknown;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
}

interface SpecialistTable {
  specialistId: string;
  role: string;
  machineName: string;
  isHuman: boolean;
  enabled: boolean;
  config: unknown;
}

interface RoundTable {
  roundId: string;
  sessionId: string;
  state: string;
  startedAt: Date;
  completedAt: Date | null;
  toState: string | null;
  transitionName: string | null;
  reasoning: string | null;
  isHuman: boolean | null;
  alignmentSnapshot: unknown;
  consensusMargin: number | null;
  threshold: number | null;
}

interface ProposalTable {
  proposalId: string;
  sessionId: string;
  roundId: string;
  specialistId: string;
  isHuman: boolean;
  transitionName: string;
  toState: string;
  reasoning: string;
  metaJson: unknown;
  costUSD: number | null;
  latencyMsec: number | null;
  numInputTokens: number | null;
  numOutputTokens: number | null;
  createdAt: Date;
}

interface Database {
  Machine: MachineTable;
  Session: SessionTable;
  Specialist: SpecialistTable;
  Round: RoundTable;
  Proposal: ProposalTable;
}

// ============================================================================
// Row <-> Domain Converters
// ============================================================================

function sessionFromRow(row: SessionTable): Session {
  const machine = row.machine as Session["machine"];
  return {
    sessionId: row.sessionId,
    machineName: row.machineName,
    currentState: machine.initialState, // overridden below from history
    currentRoundId: "", // set below
    machine,
    history: (row.history as Session["history"]) ?? [],
    createdAt: new Date(row.createdAt),
    metaJson: row.metaJson as Session["metaJson"],
  };
}

function sessionToRow(session: Session): Omit<SessionTable, "completedAt"> {
  return {
    sessionId: session.sessionId,
    machineName: session.machineName,
    machine: JSON.stringify(session.machine) as unknown,
    history: JSON.stringify(session.history) as unknown,
    metaJson: JSON.stringify(session.metaJson ?? null) as unknown,
    status: session.currentState === session.machine.goalState ? "completed" : "active",
    createdAt: session.createdAt,
  };
}

function proposalFromRow(row: ProposalTable): Proposal {
  return {
    proposalId: row.proposalId,
    sessionId: row.sessionId,
    roundId: row.roundId,
    specialistId: row.specialistId,
    isHuman: row.isHuman,
    transitionName: row.transitionName,
    toState: row.toState,
    reasoning: row.reasoning,
    metaJson: row.metaJson as Proposal["metaJson"],
    costUSD: row.costUSD ?? undefined,
    latencyMsec: row.latencyMsec ?? undefined,
    numInputTokens: row.numInputTokens ?? undefined,
    numOutputTokens: row.numOutputTokens ?? undefined,
    createdAt: new Date(row.createdAt),
  };
}

function specialistFromRow(row: SpecialistTable): Specialist | Arbiter {
  const config = (row.config ?? {}) as Record<string, unknown>;
  if (row.role === "arbiter") {
    return {
      role: "arbiter",
      specialistId: row.specialistId,
      machineName: row.machineName,
      enabled: row.enabled,
      strategyFnName: config.strategyFnName as string | undefined,
      strategyWebhookUrl: config.strategyWebhookUrl as string | undefined,
      webhookTokenName: config.webhookTokenName as string | undefined,
      threshold: config.threshold as number | undefined,
    } as Arbiter;
  }
  return {
    role: "proposer",
    specialistId: row.specialistId,
    machineName: row.machineName,
    isHuman: row.isHuman,
    enabled: row.enabled,
    strategyFnName: config.strategyFnName as string | undefined,
    strategyWebhookUrl: config.strategyWebhookUrl as string | undefined,
    webhookTokenName: config.webhookTokenName as string | undefined,
    threshold: config.threshold as number | undefined,
    contextWebhookUrl: config.contextWebhookUrl as string | undefined,
    modelId: config.modelId as string | undefined,
  };
}

// ============================================================================
// PostgreSQL Store Implementation
// ============================================================================

export function createPostgresStore(databaseUrl: string): Store {
  const dialect = new PostgresDialect({
    pool: new pg.Pool({ connectionString: databaseUrl }),
  });
  const db = new Kysely<Database>({ dialect });

  // In-memory caches for session runtime state (currentState, currentRoundId)
  // that are computed from history but not stored as-is in the DB
  const sessionRuntimeState = new Map<string, { currentState: string; currentRoundId: string }>();

  // In-memory cache for strategyFn callbacks (not serializable to DB)
  const strategyFnCache = new Map<string, (...args: unknown[]) => unknown>();

  // In-memory caches for alignment records and exemplars
  const alignmentCache = new Map<string, AlignmentRecord>();
  const exemplarCache = new Map<string, Exemplar>();

  return {
    // Sessions
    async getSession(id: string): Promise<Session | undefined> {
      const row = await db
        .selectFrom("Session")
        .selectAll()
        .where("sessionId", "=", id)
        .executeTakeFirst();
      if (!row) return undefined;

      const session = sessionFromRow(row);
      // Restore runtime state
      const runtime = sessionRuntimeState.get(id);
      if (runtime) {
        session.currentState = runtime.currentState;
        session.currentRoundId = runtime.currentRoundId;
      } else {
        // Reconstruct from history
        const history = session.history;
        if (history.length > 0) {
          session.currentState = history[history.length - 1].transitionName;
          // Find the target state from the machine definition
          // Actually reconstruct by replaying transitions
          let state = session.machine.initialState;
          for (const h of history) {
            const stateDef = session.machine.states[state];
            if (stateDef?.transitions?.[h.transitionName]) {
              state = stateDef.transitions[h.transitionName];
            }
          }
          session.currentState = state;
        }
        // Generate a round ID if we don't have one cached
        const { generateUUID } = await import("./utils.js");
        session.currentRoundId = generateUUID();
        sessionRuntimeState.set(id, {
          currentState: session.currentState,
          currentRoundId: session.currentRoundId,
        });
      }
      return session;
    },

    async setSession(session: Session): Promise<void> {
      const row = sessionToRow(session);
      // Cache runtime state
      sessionRuntimeState.set(session.sessionId, {
        currentState: session.currentState,
        currentRoundId: session.currentRoundId,
      });

      // Ensure the machine exists
      await db
        .insertInto("Machine")
        .values({
          machineName: session.machineName,
          initialState: session.machine.initialState,
          goalState: session.machine.goalState,
          states: JSON.stringify(session.machine.states) as unknown,
          specialists: JSON.stringify(session.machine.specialists ?? null) as unknown,
          consensusThreshold: session.machine.consensusThreshold ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflict((oc) =>
          oc.column("machineName").doUpdateSet({
            updatedAt: new Date(),
          })
        )
        .execute();

      // Upsert the session
      await db
        .insertInto("Session")
        .values({
          ...row,
          completedAt: row.status === "completed" ? new Date() : null,
        })
        .onConflict((oc) =>
          oc.column("sessionId").doUpdateSet({
            history: JSON.stringify(session.history) as unknown,
            metaJson: JSON.stringify(session.metaJson ?? null) as unknown,
            status: row.status,
            completedAt: row.status === "completed" ? new Date() : null,
          })
        )
        .execute();
    },

    async getAllSessions(): Promise<Session[]> {
      const rows = await db
        .selectFrom("Session")
        .selectAll()
        .execute();
      const sessions: Session[] = [];
      for (const row of rows) {
        const session = sessionFromRow(row);
        const runtime = sessionRuntimeState.get(session.sessionId);
        if (runtime) {
          session.currentState = runtime.currentState;
          session.currentRoundId = runtime.currentRoundId;
        } else {
          // Reconstruct state from history (same as getSession)
          if (session.history.length > 0) {
            let state = session.machine.initialState;
            for (const h of session.history) {
              const stateDef = session.machine.states[state];
              if (stateDef?.transitions?.[h.transitionName]) {
                state = stateDef.transitions[h.transitionName];
              }
            }
            session.currentState = state;
          }
          const { generateUUID } = await import("./utils.js");
          session.currentRoundId = generateUUID();
          sessionRuntimeState.set(session.sessionId, {
            currentState: session.currentState,
            currentRoundId: session.currentRoundId,
          });
        }
        sessions.push(session);
      }
      return sessions;
    },

    // Specialists
    async getSpecialist(id: string): Promise<(Specialist | Arbiter) | undefined> {
      const row = await db
        .selectFrom("Specialist")
        .selectAll()
        .where("specialistId", "=", id)
        .executeTakeFirst();
      if (!row) return undefined;
      const spec = specialistFromRow(row);
      const cachedFn = strategyFnCache.get(id);
      if (cachedFn) (spec as { strategyFn?: unknown }).strategyFn = cachedFn;
      return spec;
    },

    async hasSpecialist(id: string): Promise<boolean> {
      const row = await db
        .selectFrom("Specialist")
        .select("specialistId")
        .where("specialistId", "=", id)
        .executeTakeFirst();
      return row !== undefined;
    },

    async setSpecialist(specialist: Specialist | Arbiter): Promise<void> {
      // Cache strategyFn in memory (not serializable to DB)
      const fn = (specialist as { strategyFn?: (...args: unknown[]) => unknown }).strategyFn;
      if (fn) strategyFnCache.set(specialist.specialistId, fn);

      const config: Record<string, unknown> = {};
      if ("strategyFnName" in specialist) config.strategyFnName = specialist.strategyFnName;
      if ("strategyWebhookUrl" in specialist) config.strategyWebhookUrl = specialist.strategyWebhookUrl;
      if ("webhookTokenName" in specialist) config.webhookTokenName = specialist.webhookTokenName;
      if ("threshold" in specialist) config.threshold = specialist.threshold;
      if ("contextWebhookUrl" in specialist) config.contextWebhookUrl = specialist.contextWebhookUrl;
      if ("modelId" in specialist) config.modelId = specialist.modelId;

      const isHuman = "isHuman" in specialist ? (specialist.isHuman ?? false) : false;
      const enabled = specialist.enabled ?? true;

      await db
        .insertInto("Specialist")
        .values({
          specialistId: specialist.specialistId,
          role: specialist.role,
          machineName: specialist.machineName,
          isHuman,
          enabled,
          config: JSON.stringify(config) as unknown,
        })
        .onConflict((oc) =>
          oc.column("specialistId").doUpdateSet({
            role: specialist.role,
            machineName: specialist.machineName,
            isHuman,
            enabled,
            config: JSON.stringify(config) as unknown,
          })
        )
        .execute();
    },

    async getSpecialistsByMachineAndRole(machineName: string, role?: string): Promise<(Specialist | Arbiter)[]> {
      let query = db
        .selectFrom("Specialist")
        .selectAll()
        .where("machineName", "=", machineName);
      if (role !== undefined) {
        query = query.where("role", "=", role);
      }
      const rows = await query.execute();
      return rows.map((row) => {
        const spec = specialistFromRow(row);
        const cachedFn = strategyFnCache.get(spec.specialistId);
        if (cachedFn) (spec as { strategyFn?: unknown }).strategyFn = cachedFn;
        return spec;
      });
    },

    // Proposals
    async getProposal(id: string): Promise<Proposal | undefined> {
      const row = await db
        .selectFrom("Proposal")
        .selectAll()
        .where("proposalId", "=", id)
        .executeTakeFirst();
      if (!row) return undefined;
      return proposalFromRow(row);
    },

    async setProposal(proposal: Proposal): Promise<void> {
      // Ensure the round exists
      await db
        .insertInto("Round")
        .values({
          roundId: proposal.roundId,
          sessionId: proposal.sessionId,
          state: "",
          startedAt: new Date(),
          completedAt: null,
          toState: null,
          transitionName: null,
          reasoning: null,
          isHuman: null,
          alignmentSnapshot: null,
          consensusMargin: null,
          threshold: null,
        })
        .onConflict((oc) => oc.column("roundId").doNothing())
        .execute();

      await db
        .insertInto("Proposal")
        .values({
          proposalId: proposal.proposalId,
          sessionId: proposal.sessionId,
          roundId: proposal.roundId,
          specialistId: proposal.specialistId,
          isHuman: proposal.isHuman,
          transitionName: proposal.transitionName,
          toState: proposal.toState,
          reasoning: proposal.reasoning,
          metaJson: JSON.stringify(proposal.metaJson ?? null) as unknown,
          costUSD: proposal.costUSD ?? null,
          latencyMsec: proposal.latencyMsec ?? null,
          numInputTokens: proposal.numInputTokens ?? null,
          numOutputTokens: proposal.numOutputTokens ?? null,
          createdAt: proposal.createdAt,
        })
        .onConflict((oc) => oc.column("proposalId").doNothing())
        .execute();
    },

    async getProposalsByRound(sessionId: string, roundId: string): Promise<Proposal[]> {
      const rows = await db
        .selectFrom("Proposal")
        .selectAll()
        .where("sessionId", "=", sessionId)
        .where("roundId", "=", roundId)
        .execute();
      return rows.map(proposalFromRow);
    },

    async deleteProposalsBySession(sessionId: string): Promise<void> {
      await db
        .deleteFrom("Proposal")
        .where("sessionId", "=", sessionId)
        .execute();
    },

    // Alignment Records — stored in memory (ephemeral per-session computation state)
    async getAlignmentRecord(key: string): Promise<AlignmentRecord | undefined> {
      return alignmentCache.get(key);
    },

    async setAlignmentRecord(key: string, record: AlignmentRecord): Promise<void> {
      alignmentCache.set(key, record);
    },

    async getAlignmentRecordsByMachine(machineName: string, state?: string): Promise<AlignmentRecord[]> {
      return [...alignmentCache.values()].filter((r) => {
        if (r.machineName !== machineName) return false;
        if (state !== undefined) return r.state === state;
        return true;
      });
    },

    // Exemplars — stored in memory
    async setExemplar(exemplar: Exemplar): Promise<void> {
      exemplarCache.set(exemplar.exemplarId, exemplar);
    },

    async getExemplarsByMachine(machineName: string, state?: string): Promise<Exemplar[]> {
      const all = [...exemplarCache.values()].filter(
        (e) => e.machineName === machineName
      );
      if (state !== undefined) {
        return all.filter((e) => e.state === state);
      }
      return all;
    },

    // Decision Log — stored in the Round table
    async setDecisionRecord(record: DecisionRecord): Promise<void> {
      // Upsert into Round table
      await db
        .insertInto("Round")
        .values({
          roundId: record.roundId,
          sessionId: record.sessionId,
          state: record.fromState,
          startedAt: record.timestamp,
          completedAt: record.timestamp,
          toState: record.toState,
          transitionName: record.transitionName,
          reasoning: null,
          isHuman: record.isHuman,
          alignmentSnapshot: JSON.stringify(record.alignmentSnapshot) as unknown,
          consensusMargin: record.consensusMargin,
          threshold: record.threshold,
        })
        .onConflict((oc) =>
          oc.column("roundId").doUpdateSet({
            completedAt: record.timestamp,
            toState: record.toState,
            transitionName: record.transitionName,
            isHuman: record.isHuman,
            alignmentSnapshot: JSON.stringify(record.alignmentSnapshot) as unknown,
            consensusMargin: record.consensusMargin,
            threshold: record.threshold,
          })
        )
        .execute();
    },

    async getDecisionRecordsByMachine(machineName: string, limit?: number): Promise<DecisionRecord[]> {
      let query = db
        .selectFrom("Round")
        .innerJoin("Session", "Session.sessionId", "Round.sessionId")
        .selectAll("Round")
        .select("Session.machineName")
        .where("Session.machineName", "=", machineName)
        .where("Round.completedAt", "is not", null)
        .orderBy("Round.startedAt", "asc");

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      const rows = await query.execute();
      return rows.map((row) => ({
        decisionId: row.roundId,
        sessionId: row.sessionId,
        machineName: row.machineName,
        roundId: row.roundId,
        fromState: row.state,
        toState: row.toState ?? "",
        transitionName: row.transitionName ?? "",
        isHuman: row.isHuman ?? false,
        proposals: [],
        alignmentSnapshot: (row.alignmentSnapshot as Record<string, number>) ?? {},
        consensusMargin: row.consensusMargin,
        threshold: row.threshold ?? 1,
        timestamp: new Date(row.startedAt),
      }));
    },

    // Lifecycle
    async clear(): Promise<void> {
      // Clear in dependency order
      await sql`TRUNCATE "Proposal", "Round", "Session", "Specialist", "Machine", "Audit" CASCADE`.execute(db);
      sessionRuntimeState.clear();
      alignmentCache.clear();
      exemplarCache.clear();
    },

    async close(): Promise<void> {
      await db.destroy();
    },
  };
}
