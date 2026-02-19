/**
 * DIAL AI Alignment System
 *
 * Tracks how well AI specialists align with human decisions.
 * Alignment scores are used for weighted consensus and progressive collapse.
 */

import { specialists, alignmentRecords } from "./store.js";
import type { AlignmentRecord, Proposal } from "./types.js";

/**
 * Checks whether a specialist is human by looking at the isHuman flag
 * on the registered specialist. No string matching on specialistId.
 */
export function isHumanSpecialist(specialistId: string): boolean {
  const specialist = specialists.get(specialistId);
  if (!specialist) return false;
  return "isHuman" in specialist && specialist.isHuman === true;
}

/**
 * Returns the alignment score for a specialist on a machine.
 * Returns 1.0 for human specialists (always perfectly aligned).
 * Returns 0 for unknown specialists.
 */
export function getAlignmentScore(
  specialistId: string,
  machineName: string,
  state?: string
): number {
  if (isHumanSpecialist(specialistId)) {
    return 1.0;
  }

  const key = state
    ? `${specialistId}:${machineName}:${state}`
    : `${specialistId}:${machineName}`;
  const record = alignmentRecords.get(key);
  if (!record) return 0;
  return record.alignmentScore;
}

/**
 * Updates the alignment record for a specialist after a single comparison.
 */
export function updateAlignment(
  specialistId: string,
  machineName: string,
  matched: boolean,
  state?: string
): void {
  // Don't track alignment for human specialists
  if (isHumanSpecialist(specialistId)) return;

  const key = state
    ? `${specialistId}:${machineName}:${state}`
    : `${specialistId}:${machineName}`;
  const existing = alignmentRecords.get(key);

  if (existing) {
    existing.matchingChoices += matched ? 1 : 0;
    existing.totalComparisons += 1;
    existing.alignmentScore =
      existing.matchingChoices / existing.totalComparisons;
    existing.lastUpdated = new Date();
  } else {
    alignmentRecords.set(key, {
      specialistId,
      machineName,
      state,
      matchingChoices: matched ? 1 : 0,
      totalComparisons: 1,
      alignmentScore: matched ? 1 : 0,
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
export function updateAlignmentAfterHumanDecision(
  machineName: string,
  humanTransitionName: string,
  proposals: Proposal[],
  state?: string
): void {
  // Build set of human specialist IDs
  const allSpecialistIds = new Set<string>();
  for (const p of proposals) allSpecialistIds.add(p.specialistId);

  const humanSpecialistIds = new Set<string>();
  for (const id of allSpecialistIds) {
    if (isHumanSpecialist(id)) humanSpecialistIds.add(id);
  }

  const updates = computeAlignmentUpdates(
    humanTransitionName,
    proposals,
    humanSpecialistIds
  );

  for (const { specialistId, matched } of updates) {
    updateAlignment(specialistId, machineName, matched, state);
  }
}

/**
 * Returns all alignment records for a machine.
 */
export function getAllAlignmentRecords(
  machineName: string,
  state?: string
): AlignmentRecord[] {
  return [...alignmentRecords.values()].filter(
    (r) => {
      if (r.machineName !== machineName) return false;
      if (state !== undefined) return r.state === state;
      return true;
    }
  );
}
