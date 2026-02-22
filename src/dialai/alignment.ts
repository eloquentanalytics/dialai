/**
 * DIAL AI Alignment System
 *
 * Tracks how well AI specialists align with human decisions.
 * Alignment scores are used for weighted consensus and progressive collapse.
 */

import { getStore } from "./store.js";
import type { AlignmentRecord, Proposal } from "./types.js";

/**
 * Wilson score lower bound for a binomial proportion.
 * Returns the lower bound of a confidence interval, naturally penalizing
 * small sample sizes. Used instead of naive `matches/total` so that
 * 1/1 ≈ 0.21 (not 1.0) and confidence grows with evidence.
 *
 * @param matches - Number of successes
 * @param total - Total number of trials
 * @param z - Z-score for confidence level (default 1.96 = 95%)
 */
export function wilsonLowerBound(matches: number, total: number, z = 1.96): number {
  if (total === 0) return 0;
  const phat = matches / total;
  const z2 = z * z;
  const numerator = phat + z2 / (2 * total) - z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total);
  const denominator = 1 + z2 / total;
  return Math.max(0, numerator / denominator);
}

/**
 * Checks whether a specialist is human by looking at the isHuman flag
 * on the registered specialist. No string matching on specialistId.
 */
export async function isHumanSpecialist(specialistId: string): Promise<boolean> {
  const specialist = await getStore().getSpecialist(specialistId);
  if (!specialist) return false;
  return "isHuman" in specialist && specialist.isHuman === true;
}

/**
 * Returns the alignment score for a specialist on a machine.
 * Returns 1.0 for human specialists (always perfectly aligned).
 * Returns 0 for unknown specialists.
 */
export async function getAlignmentScore(
  specialistId: string,
  machineName: string,
  state?: string
): Promise<number> {
  if (await isHumanSpecialist(specialistId)) {
    return 1.0;
  }

  const key = state
    ? `${specialistId}:${machineName}:${state}`
    : `${specialistId}:${machineName}`;
  const record = await getStore().getAlignmentRecord(key);
  if (!record) return 0;
  return record.alignmentScore;
}

/**
 * Updates the alignment record for a specialist after a single comparison.
 */
export async function updateAlignment(
  specialistId: string,
  machineName: string,
  matched: boolean,
  state?: string
): Promise<void> {
  // Don't track alignment for human specialists
  if (await isHumanSpecialist(specialistId)) return;

  const key = state
    ? `${specialistId}:${machineName}:${state}`
    : `${specialistId}:${machineName}`;
  const existing = await getStore().getAlignmentRecord(key);

  if (existing) {
    existing.matchingChoices += matched ? 1 : 0;
    existing.totalComparisons += 1;
    existing.alignmentScore =
      wilsonLowerBound(existing.matchingChoices, existing.totalComparisons);
    existing.lastUpdated = new Date();
    await getStore().setAlignmentRecord(key, existing);
  } else {
    await getStore().setAlignmentRecord(key, {
      specialistId,
      machineName,
      state,
      matchingChoices: matched ? 1 : 0,
      totalComparisons: 1,
      alignmentScore: wilsonLowerBound(matched ? 1 : 0, 1),
      lastUpdated: new Date(),
    });
  }
}

/**
 * Pure function: computes alignment updates for all specialists given a human decision.
 * Returns an array of { specialistId, matched } without touching the store.
 */
export function computeAlignmentUpdates(
  humanTransitionName: string,
  proposals: Proposal[],
  humanSpecialistIds: Set<string>
): Array<{ specialistId: string; matched: boolean }> {
  const results: Array<{ specialistId: string; matched: boolean }> = [];

  // Check proposers: did they propose the same transition?
  for (const proposal of proposals) {
    if (humanSpecialistIds.has(proposal.specialistId)) continue;
    const matched = proposal.transitionName === humanTransitionName;
    results.push({ specialistId: proposal.specialistId, matched });
  }

  return results;
}

/**
 * Updates alignment for all specialists after a human forces a decision.
 * Thin wrapper: builds the human IDs set, calls the pure function, applies results.
 */
export async function updateAlignmentAfterHumanDecision(
  machineName: string,
  humanTransitionName: string,
  proposals: Proposal[],
  state?: string
): Promise<void> {
  // Build set of human specialist IDs
  const allSpecialistIds = new Set<string>();
  for (const p of proposals) allSpecialistIds.add(p.specialistId);

  const humanSpecialistIds = new Set<string>();
  for (const id of allSpecialistIds) {
    if (await isHumanSpecialist(id)) humanSpecialistIds.add(id);
  }

  const updates = computeAlignmentUpdates(
    humanTransitionName,
    proposals,
    humanSpecialistIds
  );

  for (const { specialistId, matched } of updates) {
    await updateAlignment(specialistId, machineName, matched, state);
  }
}

/**
 * Returns all alignment records for a machine.
 */
export async function getAllAlignmentRecords(
  machineName: string,
  state?: string
): Promise<AlignmentRecord[]> {
  return getStore().getAlignmentRecordsByMachine(machineName, state);
}
