/**
 * DIAL AI Exemplar System
 *
 * Creates and retrieves exemplars - snapshots of context when a human
 * forces a decision. These serve as gold-standard examples for
 * alignment tracking and similarity-based consensus.
 */

import { getStore } from "./store.js";
import { generateUUID } from "./utils.js";
import type {
  Exemplar,
  ProposerContext,
  Proposal,
} from "./types.js";

/**
 * Creates and stores an exemplar from a human-forced decision.
 */
export async function createExemplar(
  machineName: string,
  state: string,
  context: ProposerContext,
  humanTransitionName: string,
  humanToState: string,
  proposals: Proposal[]
): Promise<Exemplar> {
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

  await getStore().setExemplar(exemplar);
  return exemplar;
}

/**
 * Returns all exemplars for a machine, optionally filtered by state.
 */
export async function getExemplars(
  machineName: string,
  state?: string
): Promise<Exemplar[]> {
  return getStore().getExemplarsByMachine(machineName, state);
}
