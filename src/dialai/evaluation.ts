/**
 * DIAL AI Evaluation System
 *
 * Evaluates specialist alignment and accuracy against human decisions.
 */

import { specialists } from "./store.js";
import { getExemplars } from "./exemplars.js";
import type {
  AlignmentEvaluationResult,
  AccuracyEvaluationResult,
} from "./types.js";

/**
 * Evaluates a specialist's alignment with human decisions by comparing
 * against stored exemplars.
 *
 * @param specialistId - The specialist to evaluate
 * @param machineName - The machine to evaluate against
 * @param options - Optional configuration
 * @returns Alignment evaluation result
 */
export function evaluateAlignment(
  specialistId: string,
  machineName: string,
  options?: { maxRounds?: number }
): AlignmentEvaluationResult {
  const specialist = specialists.get(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }

  const exemplars = getExemplars(machineName);
  const maxRounds = options?.maxRounds ?? exemplars.length;
  const evaluationExemplars = exemplars.slice(0, maxRounds);

  let matchingDecisions = 0;

  for (const exemplar of evaluationExemplars) {
    // Check if the specialist proposed the same transition as the human
    const specialistProposal = exemplar.proposals.find(
      (p) => p.specialistId === specialistId
    );

    if (specialistProposal) {
      if (specialistProposal.transitionName === exemplar.humanTransitionName) {
        matchingDecisions++;
      }
    } else {
      // Check if the specialist voted for the human's choice
      const specialistVote = exemplar.votes.find(
        (v) => v.specialistId === specialistId
      );

      if (specialistVote) {
        const proposalA = exemplar.proposals.find(
          (p) => p.proposalId === specialistVote.proposalIdA
        );
        const proposalB = exemplar.proposals.find(
          (p) => p.proposalId === specialistVote.proposalIdB
        );

        const aMatches =
          proposalA?.transitionName === exemplar.humanTransitionName;
        const bMatches =
          proposalB?.transitionName === exemplar.humanTransitionName;

        if (
          (aMatches && specialistVote.voteFor === "A") ||
          (bMatches && specialistVote.voteFor === "B") ||
          ((aMatches || bMatches) && specialistVote.voteFor === "BOTH")
        ) {
          matchingDecisions++;
        }
      }

      // Check selection votes
      const selectionVote = exemplar.selectionVotes.find(
        (sv) => sv.specialistId === specialistId
      );

      if (selectionVote) {
        const selectedProposal = exemplar.proposals.find(
          (p) => p.proposalId === selectionVote.selectedProposalId
        );
        if (
          selectedProposal?.transitionName === exemplar.humanTransitionName
        ) {
          matchingDecisions++;
        }
      }
    }
  }

  const totalExemplars = evaluationExemplars.length;

  return {
    specialistId,
    machineName,
    totalExemplars,
    matchingDecisions,
    alignmentScore: totalExemplars > 0 ? matchingDecisions / totalExemplars : 0,
  };
}

/**
 * Evaluates a specialist's accuracy by analyzing their proposal history.
 * Compares proposals against the transitions that were actually executed.
 *
 * @param specialistId - The specialist to evaluate
 * @param machineName - The machine to evaluate against
 * @param options - Optional configuration
 * @returns Accuracy evaluation result
 */
export function evaluateAccuracy(
  specialistId: string,
  machineName: string,
  options?: { lookback?: number }
): AccuracyEvaluationResult {
  const specialist = specialists.get(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }

  const exemplars = getExemplars(machineName);
  const lookback = options?.lookback ?? exemplars.length;
  const evaluationExemplars = exemplars.slice(-lookback);

  let transitionMatches = 0;
  let stateMatches = 0;
  let totalDecisions = 0;
  let totalCost = 0;
  let totalLatency = 0;
  let latencyCount = 0;

  for (const exemplar of evaluationExemplars) {
    const specialistProposal = exemplar.proposals.find(
      (p) => p.specialistId === specialistId
    );

    if (specialistProposal) {
      totalDecisions++;

      if (specialistProposal.transitionName === exemplar.humanTransitionName) {
        transitionMatches++;
      }
      if (specialistProposal.toState === exemplar.humanToState) {
        stateMatches++;
      }

      if (specialistProposal.costUSD) {
        totalCost += specialistProposal.costUSD;
      }
      if (specialistProposal.latencyMsec) {
        totalLatency += specialistProposal.latencyMsec;
        latencyCount++;
      }
    }
  }

  return {
    specialistId,
    machineName,
    totalDecisions,
    transitionMatchRate:
      totalDecisions > 0 ? transitionMatches / totalDecisions : 0,
    stateMatchRate: totalDecisions > 0 ? stateMatches / totalDecisions : 0,
    totalCostUSD: totalCost,
    avgLatencyMsec: latencyCount > 0 ? totalLatency / latencyCount : 0,
  };
}
