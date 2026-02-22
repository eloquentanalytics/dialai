/**
 * DIAL AI Store
 *
 * Pluggable persistence layer. Exports the Store interface and a singleton
 * accessor. Default store is in-memory (createMemoryStore). Set a different
 * store via setStore() for Postgres or other backends.
 */

import type {
  Session,
  Specialist,
  Arbiter,
  Proposal,
  AlignmentRecord,
  Exemplar,
  DecisionRecord,
} from "./types.js";
import { createMemoryStore } from "./store-memory.js";

// ============================================================================
// Store Interface
// ============================================================================

export interface Store {
  // Sessions
  getSession(id: string): Promise<Session | undefined>;
  setSession(session: Session): Promise<void>;
  getAllSessions(): Promise<Session[]>;

  // Specialists
  getSpecialist(id: string): Promise<(Specialist | Arbiter) | undefined>;
  hasSpecialist(id: string): Promise<boolean>;
  setSpecialist(specialist: Specialist | Arbiter): Promise<void>;
  getSpecialistsByMachineAndRole(machineName: string, role?: string): Promise<(Specialist | Arbiter)[]>;

  // Proposals
  getProposal(id: string): Promise<Proposal | undefined>;
  setProposal(proposal: Proposal): Promise<void>;
  getProposalsByRound(sessionId: string, roundId: string): Promise<Proposal[]>;
  deleteProposalsBySession(sessionId: string): Promise<void>;

  // Alignment Records
  getAlignmentRecord(key: string): Promise<AlignmentRecord | undefined>;
  setAlignmentRecord(key: string, record: AlignmentRecord): Promise<void>;
  getAlignmentRecordsByMachine(machineName: string, state?: string): Promise<AlignmentRecord[]>;

  // Exemplars
  setExemplar(exemplar: Exemplar): Promise<void>;
  getExemplarsByMachine(machineName: string, state?: string): Promise<Exemplar[]>;

  // Decision Log
  setDecisionRecord(record: DecisionRecord): Promise<void>;
  getDecisionRecordsByMachine(machineName: string, limit?: number): Promise<DecisionRecord[]>;

  // Lifecycle
  clear(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Singleton
// ============================================================================

let _store: Store = createMemoryStore();

/**
 * Returns the current store singleton.
 */
export function getStore(): Store {
  return _store;
}

/**
 * Replaces the current store singleton.
 * Use this to switch to a Postgres or other backend.
 */
export function setStore(store: Store): void {
  _store = store;
}

/**
 * Clears all state in the current store.
 */
export async function clear(): Promise<void> {
  return _store.clear();
}
