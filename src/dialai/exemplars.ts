/**
 * DIAL AI Exemplar System
 *
 * Creates and retrieves exemplars - snapshots of context when a human
 * forces a decision. These serve as gold-standard examples for
 * alignment tracking and similarity-based consensus.
 */

import { exemplars } from "./store.js";
import { generateUUID } from "./utils.js";
import type {
  Exemplar,
  ProposerContext,
  Proposal,
} from "./types.js";

/**
 * Creates and stores an exemplar from a human-forced decision.
 */
export function createExemplar(
  machineName: string,
  state: string,
  context: ProposerContext,
  humanTransitionName: string,
  humanToState: string,
  proposals: Proposal[]
): Exemplar {
  const exemplar: Exemplar = {
    exemplarId: generateUUID(),
    machineName,
    state,
    context,
    humanTransitionName,
    humanToState,
    proposals: [...proposals],
    createdAt: new Date(),
  };

  exemplars.set(exemplar.exemplarId, exemplar);
  return exemplar;
}

/**
 * Returns all exemplars for a machine, optionally filtered by state.
 */
export function getExemplars(
  machineName: string,
  state?: string
): Exemplar[] {
  const all = [...exemplars.values()].filter(
    (e) => e.machineName === machineName
  );
  if (state !== undefined) {
    return all.filter((e) => e.state === state);
  }
  return all;
}
