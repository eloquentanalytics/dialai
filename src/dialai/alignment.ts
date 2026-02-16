/**
 * DIAL AI Alignment System
 *
 * Tracks how well AI specialists align with human decisions.
 * Alignment scores are used for weighted consensus and progressive collapse.
 */

import { specialists, alignmentRecords } from "./store.js";
import type { AlignmentRecord, Proposal, Vote, SelectionVote } from "./types.js";

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
  machineName: string
): number {
  if (isHumanSpecialist(specialistId)) {
    return 1.0;
  }

  const key = `${specialistId}:${machineName}`;
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
  matched: boolean
): void {
  // Don't track alignment for human specialists
  if (isHumanSpecialist(specialistId)) return;

  const key = `${specialistId}:${machineName}`;
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
      matchingChoices: matched ? 1 : 0,
      totalComparisons: 1,
      alignmentScore: matched ? 1 : 0,
      lastUpdated: new Date(),
    });
  }
}

/**
 * Updates alignment for all specialists after a human forces a decision.
 * Compares each specialist's proposals and votes against the human's chosen transition.
 */
export function updateAlignmentAfterHumanDecision(
  machineName: string,
  humanTransitionName: string,
  proposals: Proposal[],
  votes: Vote[],
  roundSelectionVotes: SelectionVote[]
): void {
  // Check proposers: did they propose the same transition?
  for (const proposal of proposals) {
    if (isHumanSpecialist(proposal.specialistId)) continue;
    const matched = proposal.transitionName === humanTransitionName;
    updateAlignment(proposal.specialistId, machineName, matched);
  }

  // Check pairwise voters: did they vote for the proposal matching the human choice?
  for (const vote of votes) {
    if (isHumanSpecialist(vote.specialistId)) continue;

    // Find which proposal (A or B) matches the human transition
    const proposalA = proposals.find((p) => p.proposalId === vote.proposalIdA);
    const proposalB = proposals.find((p) => p.proposalId === vote.proposalIdB);

    const aMatches = proposalA?.transitionName === humanTransitionName;
    const bMatches = proposalB?.transitionName === humanTransitionName;

    let matched = false;
    if (aMatches && vote.voteFor === "A") matched = true;
    if (bMatches && vote.voteFor === "B") matched = true;
    if ((aMatches || bMatches) && vote.voteFor === "BOTH") matched = true;
    if (!aMatches && !bMatches && vote.voteFor === "NEITHER") matched = true;

    updateAlignment(vote.specialistId, machineName, matched);
  }

  // Check selection voters: did they select the proposal matching the human choice?
  for (const sv of roundSelectionVotes) {
    if (isHumanSpecialist(sv.specialistId)) continue;

    const selectedProposal = proposals.find(
      (p) => p.proposalId === sv.selectedProposalId
    );
    const matched = selectedProposal?.transitionName === humanTransitionName;
    updateAlignment(sv.specialistId, machineName, matched ?? false);
  }
}

/**
 * Returns all alignment records for a machine.
 */
export function getAllAlignmentRecords(
  machineName: string
): AlignmentRecord[] {
  return [...alignmentRecords.values()].filter(
    (r) => r.machineName === machineName
  );
}
