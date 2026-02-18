/**
 * DIAL AI Built-in Consensus Strategies
 *
 * Implementations for proposer and arbiter strategies.
 */

import type {
  ProposerContext,
  ProposerStrategyResult,
  ArbiterContext,
  ArbiterStrategyResult,
} from "./types.js";

// ============================================================================
// Proposer Strategies
// ============================================================================

/**
 * Returns the first available transition.
 */
export async function firstAvailable(
  ctx: ProposerContext
): Promise<ProposerStrategyResult> {
  const transitionNames = Object.keys(ctx.transitions);
  if (transitionNames.length === 0) {
    throw new Error("No transitions available from current state");
  }
  const transitionName = transitionNames[0];
  const toState = ctx.transitions[transitionName];
  return {
    transitionName,
    toState,
    reasoning: `Choosing first available transition: ${transitionName}`,
  };
}

/**
 * Returns the last available transition.
 */
export async function lastAvailable(
  ctx: ProposerContext
): Promise<ProposerStrategyResult> {
  const transitionNames = Object.keys(ctx.transitions);
  if (transitionNames.length === 0) {
    throw new Error("No transitions available from current state");
  }
  const transitionName = transitionNames[transitionNames.length - 1];
  const toState = ctx.transitions[transitionName];
  return {
    transitionName,
    toState,
    reasoning: `Choosing last available transition: ${transitionName}`,
  };
}

/**
 * Returns a random transition.
 */
export async function randomProposer(
  ctx: ProposerContext
): Promise<ProposerStrategyResult> {
  const transitionNames = Object.keys(ctx.transitions);
  if (transitionNames.length === 0) {
    throw new Error("No transitions available from current state");
  }
  const index = Math.floor(Math.random() * transitionNames.length);
  const transitionName = transitionNames[index];
  const toState = ctx.transitions[transitionName];
  return {
    transitionName,
    toState,
    reasoning: `Randomly selected transition: ${transitionName}`,
  };
}

/**
 * Returns a weighted random transition (uniform weights for now).
 */
export async function weightedRandom(
  ctx: ProposerContext
): Promise<ProposerStrategyResult> {
  // For now, use uniform weights - could be extended with threshold param
  return randomProposer(ctx);
}

/** Map of built-in proposer strategy names to functions */
export const proposerStrategies: Record<
  string,
  (ctx: ProposerContext) => Promise<ProposerStrategyResult>
> = {
  firstAvailable,
  lastAvailable,
  random: randomProposer,
  weightedRandom,
};

// ============================================================================
// Arbiter Strategies
// ============================================================================

/**
 * Returns the first proposal by timestamp.
 * No voting required - simplest strategy.
 */
export async function firstProposal(
  ctx: ArbiterContext
): Promise<ArbiterStrategyResult> {
  if (ctx.proposals.length === 0) {
    return {
      consensusReached: false,
      reasoning: "No proposals received",
    };
  }

  // Sort by creation timestamp and take the first
  const sortedProposals = [...ctx.proposals].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  const first = sortedProposals[0];

  return {
    consensusReached: true,
    winningProposalId: first.proposalId,
    reasoning: `First proposal received wins (from ${first.specialistId})`,
  };
}

/**
 * Ahead-by-K consensus strategy using alignment-weighted margin.
 *
 * Single proposal + threshold <= 1: consensus immediately.
 * Multiple proposals: alignment-weighted margin.
 *   1. Group proposals by transitionName
 *   2. Score each group by sum of proposer alignment scores
 *   3. margin = (leader - runnerUp) / totalAlignment
 *   4. Cold start (totalAlignment = 0): no consensus
 *   5. Consensus when margin >= threshold
 *   6. Pick best proposal in winning transition (highest-alignment proposer)
 */
export async function aheadByK(
  ctx: ArbiterContext
): Promise<ArbiterStrategyResult> {
  const threshold = ctx.threshold ?? 1;

  if (ctx.proposals.length === 0) {
    return {
      consensusReached: false,
      reasoning: "No proposals",
    };
  }

  // Single proposal: consensus if threshold allows
  if (ctx.proposals.length === 1 && threshold <= 1) {
    return {
      consensusReached: true,
      winningProposalId: ctx.proposals[0].proposalId,
      reasoning: `Single proposal with no competing proposals`,
    };
  }

  // Multiple proposals (or single with threshold > 1): alignment-weighted margin
  const scores = ctx.alignmentScores ?? {};
  const getScore = (specialistId: string): number => scores[specialistId] ?? 0;

  // Group proposals by transition, score each group by summing alignment
  const transitionScores = new Map<string, { score: number; bestProposalId: string; bestAlignment: number }>();
  let totalAlignment = 0;

  for (const proposal of ctx.proposals) {
    const alignment = getScore(proposal.specialistId);
    totalAlignment += alignment;

    const existing = transitionScores.get(proposal.transitionName);
    if (existing) {
      existing.score += alignment;
      if (alignment > existing.bestAlignment) {
        existing.bestAlignment = alignment;
        existing.bestProposalId = proposal.proposalId;
      }
    } else {
      transitionScores.set(proposal.transitionName, {
        score: alignment,
        bestProposalId: proposal.proposalId,
        bestAlignment: alignment,
      });
    }
  }

  // Cold start: if all alignment is 0, no consensus possible
  if (totalAlignment === 0) {
    return {
      consensusReached: false,
      reasoning: "Cold start: no alignment data available, human input required",
    };
  }

  // Sort transitions by score descending
  const sorted = [...transitionScores.entries()].sort(
    (a, b) => b[1].score - a[1].score
  );

  const leaderScore = sorted[0][1].score;
  const runnerUpScore = sorted.length > 1 ? sorted[1][1].score : 0;

  const margin = (leaderScore - runnerUpScore) / totalAlignment;

  if (margin >= threshold) {
    return {
      consensusReached: true,
      winningProposalId: sorted[0][1].bestProposalId,
      reasoning: `Alignment-weighted margin ${margin.toFixed(2)} >= threshold ${threshold} (leader: ${sorted[0][0]})`,
    };
  }

  return {
    consensusReached: false,
    reasoning: `Alignment-weighted margin ${margin.toFixed(2)} below threshold ${threshold}`,
  };
}

/** Map of built-in arbiter strategy names to functions */
export const arbiterStrategies: Record<
  string,
  (ctx: ArbiterContext) => Promise<ArbiterStrategyResult>
> = {
  firstProposal,
  aheadByK,
};
