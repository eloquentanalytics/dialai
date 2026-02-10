/**
 * DIAL AI In-Memory Store
 *
 * Simple in-memory Maps with no business logic.
 * All API functions read from and write to these maps.
 */

import type { Session, Specialist, Arbiter, Proposal, Vote } from "./types.js";

/** All sessions by ID */
export const sessions: Map<string, Session> = new Map();

/** All registered specialists by ID */
export const specialists: Map<string, Specialist | Arbiter> = new Map();

/** All proposals by ID */
export const proposals: Map<string, Proposal> = new Map();

/** All votes by ID */
export const votes: Map<string, Vote> = new Map();

/**
 * Clears all in-memory state.
 * Useful for testing and resetting between runs.
 */
export function clear(): void {
  sessions.clear();
  specialists.clear();
  proposals.clear();
  votes.clear();
}
