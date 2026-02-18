/**
 * DIAL AI In-Memory Store
 *
 * Simple in-memory Maps with no business logic.
 * All API functions read from and write to these maps.
 */

import type { Session, Specialist, Arbiter, Proposal, AlignmentRecord, Exemplar } from "./types.js";

/** All sessions by ID */
export const sessions: Map<string, Session> = new Map();

/** All registered specialists by ID */
export const specialists: Map<string, Specialist | Arbiter> = new Map();

/** All proposals by ID */
export const proposals: Map<string, Proposal> = new Map();

/** Alignment records keyed by "specialistId:machineName" */
export const alignmentRecords: Map<string, AlignmentRecord> = new Map();

/** All exemplars by ID */
export const exemplars: Map<string, Exemplar> = new Map();

/**
 * Clears all in-memory state.
 * Useful for testing and resetting between runs.
 */
export function clear(): void {
  sessions.clear();
  specialists.clear();
  proposals.clear();
  alignmentRecords.clear();
  exemplars.clear();
}
