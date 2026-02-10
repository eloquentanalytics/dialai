/**
 * DIAL AI Built-in Consensus Strategies
 *
 * Implementations for proposer, voter, and arbiter strategies.
 */

import type {
  ProposerContext,
  ProposerStrategyResult,
  VoterContext,
  VoterStrategyResult,
  ArbiterContext,
  ArbiterStrategyResult,
  VoteChoice,
  Proposal,
  Vote,
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
// Voter Strategies
// ============================================================================

/**
 * Always prefer proposal A.
 */
export async function preferA(ctx: VoterContext): Promise<VoterStrategyResult> {
  return {
    voteFor: "A",
    reasoning: `Preferring proposal A: ${ctx.proposalA.transitionName}`,
  };
}

/**
 * Always prefer proposal B.
 */
export async function preferB(ctx: VoterContext): Promise<VoterStrategyResult> {
  return {
    voteFor: "B",
    reasoning: `Preferring proposal B: ${ctx.proposalB.transitionName}`,
  };
}

/**
 * Vote for both proposals.
 */
export async function both(_ctx: VoterContext): Promise<VoterStrategyResult> {
  return {
    voteFor: "BOTH",
    reasoning: "Both proposals are acceptable",
  };
}

/**
 * Vote for neither proposal.
 */
export async function neither(_ctx: VoterContext): Promise<VoterStrategyResult> {
  return {
    voteFor: "NEITHER",
    reasoning: "Neither proposal is acceptable",
  };
}

/**
 * Randomly vote between A, B, BOTH, or NEITHER.
 */
export async function randomVoter(
  _ctx: VoterContext
): Promise<VoterStrategyResult> {
  const choices: VoteChoice[] = ["A", "B", "BOTH", "NEITHER"];
  const index = Math.floor(Math.random() * choices.length);
  const voteFor = choices[index];
  return {
    voteFor,
    reasoning: `Randomly selected: ${voteFor}`,
  };
}

/**
 * Randomly vote between A and B only.
 */
export async function randomAll(
  _ctx: VoterContext
): Promise<VoterStrategyResult> {
  const choices: VoteChoice[] = ["A", "B"];
  const index = Math.floor(Math.random() * choices.length);
  const voteFor = choices[index];
  return {
    voteFor,
    reasoning: `Randomly selected between A and B: ${voteFor}`,
  };
}

/**
 * Prefer the proposal that leads toward the goal state.
 * Requires session context to know the goal state.
 */
export async function preferGoal(
  ctx: VoterContext
): Promise<VoterStrategyResult> {
  // This is a simplified implementation - in practice would need goal state info
  // For now, prefer whichever has a shorter state name (heuristic)
  if (ctx.proposalA.toState.length <= ctx.proposalB.toState.length) {
    return {
      voteFor: "A",
      reasoning: `Preferring proposal A (toState: ${ctx.proposalA.toState}) as potentially closer to goal`,
    };
  }
  return {
    voteFor: "B",
    reasoning: `Preferring proposal B (toState: ${ctx.proposalB.toState}) as potentially closer to goal`,
  };
}

/**
 * Prefer the proposal with a shorter path name.
 */
export async function preferShorterPath(
  ctx: VoterContext
): Promise<VoterStrategyResult> {
  if (
    ctx.proposalA.transitionName.length <= ctx.proposalB.transitionName.length
  ) {
    return {
      voteFor: "A",
      reasoning: `Preferring proposal A with shorter path: ${ctx.proposalA.transitionName}`,
    };
  }
  return {
    voteFor: "B",
    reasoning: `Preferring proposal B with shorter path: ${ctx.proposalB.transitionName}`,
  };
}

/** Map of built-in voter strategy names to functions */
export const voterStrategies: Record<
  string,
  (ctx: VoterContext) => Promise<VoterStrategyResult>
> = {
  preferA,
  preferB,
  both,
  neither,
  random: randomVoter,
  randomAll,
  preferGoal,
  preferShorterPath,
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
 * Tally votes for proposals.
 */
function tallyVotes(
  proposals: Proposal[],
  votes: Vote[]
): Map<string, number> {
  const tallies = new Map<string, number>();

  // Initialize tallies for all proposals
  for (const proposal of proposals) {
    tallies.set(proposal.proposalId, 0);
  }

  // Count votes
  for (const vote of votes) {
    if (vote.voteFor === "A") {
      const current = tallies.get(vote.proposalIdA) ?? 0;
      tallies.set(vote.proposalIdA, current + 1);
    } else if (vote.voteFor === "B") {
      const current = tallies.get(vote.proposalIdB) ?? 0;
      tallies.set(vote.proposalIdB, current + 1);
    } else if (vote.voteFor === "BOTH") {
      const currentA = tallies.get(vote.proposalIdA) ?? 0;
      tallies.set(vote.proposalIdA, currentA + 1);
      const currentB = tallies.get(vote.proposalIdB) ?? 0;
      tallies.set(vote.proposalIdB, currentB + 1);
    }
    // NEITHER adds nothing
  }

  return tallies;
}

/**
 * Leader must be ahead by threshold votes.
 * Default threshold is 1.
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

  if (ctx.proposals.length === 1) {
    // Single proposal: check if it has enough support
    const support = ctx.votes.filter(
      (v) =>
        (v.proposalIdA === ctx.proposals[0].proposalId && v.voteFor === "A") ||
        (v.proposalIdB === ctx.proposals[0].proposalId && v.voteFor === "B") ||
        v.voteFor === "BOTH"
    ).length;

    // With single proposal and no votes, consider it consensus if threshold allows
    if (ctx.votes.length === 0 && threshold <= 1) {
      return {
        consensusReached: true,
        winningProposalId: ctx.proposals[0].proposalId,
        reasoning: `Single proposal with no competing proposals`,
      };
    }

    if (support >= threshold) {
      return {
        consensusReached: true,
        winningProposalId: ctx.proposals[0].proposalId,
        reasoning: `Single proposal with ${support} votes`,
      };
    }
    return {
      consensusReached: false,
      reasoning: `Single proposal needs ${threshold} votes, has ${support}`,
    };
  }

  // Multiple proposals: tally votes
  const tallies = tallyVotes(ctx.proposals, ctx.votes);

  // Sort by tally descending
  const sortedTallies = [...tallies.entries()].sort((a, b) => b[1] - a[1]);

  const [leaderId, leaderVotes] = sortedTallies[0];
  const runnerUpVotes = sortedTallies.length > 1 ? sortedTallies[1][1] : 0;

  const lead = leaderVotes - runnerUpVotes;

  if (lead >= threshold) {
    return {
      consensusReached: true,
      winningProposalId: leaderId,
      reasoning: `Ahead by ${lead} votes (threshold: ${threshold})`,
    };
  }

  return {
    consensusReached: false,
    reasoning: `Lead of ${lead} below threshold ${threshold}`,
  };
}

/**
 * Semantic similarity to human gold examples.
 * Simplified implementation using string comparison.
 */
export async function mostSimilar(
  ctx: ArbiterContext
): Promise<ArbiterStrategyResult> {
  const threshold = ctx.threshold ?? 0.8;

  if (!ctx.humanGoldExamples || ctx.humanGoldExamples.length === 0) {
    return {
      consensusReached: false,
      reasoning: "No human gold examples available",
    };
  }

  if (ctx.proposals.length === 0) {
    return {
      consensusReached: false,
      reasoning: "No proposals",
    };
  }

  // Calculate similarity scores for each proposal
  const scores: { proposalId: string; similarity: number }[] = [];

  for (const proposal of ctx.proposals) {
    // Find max similarity to any gold example
    let maxSimilarity = 0;
    for (const gold of ctx.humanGoldExamples) {
      // Simple similarity: exact match on transitionName + basic string similarity on reasoning
      let similarity = 0;
      if (proposal.transitionName === gold.transitionName) {
        similarity = 0.5; // Half credit for matching transition
        // Add basic reasoning similarity (Jaccard-like)
        const proposalWords = new Set(proposal.reasoning.toLowerCase().split(/\s+/));
        const goldWords = new Set(gold.reasoning.toLowerCase().split(/\s+/));
        const intersection = [...proposalWords].filter((w) => goldWords.has(w)).length;
        const union = new Set([...proposalWords, ...goldWords]).size;
        if (union > 0) {
          similarity += 0.5 * (intersection / union);
        }
      }
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    scores.push({ proposalId: proposal.proposalId, similarity: maxSimilarity });
  }

  // Sort by similarity descending
  scores.sort((a, b) => b.similarity - a.similarity);

  if (scores[0].similarity < threshold) {
    return {
      consensusReached: false,
      reasoning: `Best similarity ${scores[0].similarity.toFixed(2)} below threshold ${threshold}`,
    };
  }

  // Check for clear winner if multiple proposals
  if (scores.length >= 2) {
    const gap = scores[0].similarity - scores[1].similarity;
    if (gap < 0.05) {
      return {
        consensusReached: false,
        reasoning: `No clear winner: top two within ${gap.toFixed(2)} similarity`,
      };
    }
  }

  return {
    consensusReached: true,
    winningProposalId: scores[0].proposalId,
    reasoning: `Proposal most similar to human gold (similarity: ${scores[0].similarity.toFixed(2)})`,
  };
}

/**
 * Pairwise consensus using Bradley-Terry win rate calculation.
 */
export async function pairwiseConsensus(
  ctx: ArbiterContext
): Promise<ArbiterStrategyResult> {
  const threshold = ctx.threshold ?? 0.75;

  if (ctx.proposals.length === 0) {
    return {
      consensusReached: false,
      reasoning: "No proposals",
    };
  }

  if (ctx.proposals.length === 1) {
    return {
      consensusReached: true,
      winningProposalId: ctx.proposals[0].proposalId,
      reasoning: "Single proposal",
    };
  }

  // Build matchup results from votes
  const wins = new Map<string, number>();
  const matchups = new Map<string, number>();

  for (const proposal of ctx.proposals) {
    wins.set(proposal.proposalId, 0);
    matchups.set(proposal.proposalId, 0);
  }

  for (const vote of ctx.votes) {
    // Track matchups
    const matchupsA = matchups.get(vote.proposalIdA) ?? 0;
    matchups.set(vote.proposalIdA, matchupsA + 1);
    const matchupsB = matchups.get(vote.proposalIdB) ?? 0;
    matchups.set(vote.proposalIdB, matchupsB + 1);

    // Track wins
    if (vote.voteFor === "A") {
      const winsA = wins.get(vote.proposalIdA) ?? 0;
      wins.set(vote.proposalIdA, winsA + 1);
    } else if (vote.voteFor === "B") {
      const winsB = wins.get(vote.proposalIdB) ?? 0;
      wins.set(vote.proposalIdB, winsB + 1);
    } else if (vote.voteFor === "BOTH") {
      const winsA = wins.get(vote.proposalIdA) ?? 0;
      wins.set(vote.proposalIdA, winsA + 0.5);
      const winsB = wins.get(vote.proposalIdB) ?? 0;
      wins.set(vote.proposalIdB, winsB + 0.5);
    }
    // NEITHER: no wins awarded
  }

  // Calculate win rate for each proposal
  const winRates: { proposalId: string; rate: number }[] = [];
  for (const proposal of ctx.proposals) {
    const proposalMatchups = matchups.get(proposal.proposalId) ?? 0;
    const proposalWins = wins.get(proposal.proposalId) ?? 0;
    const rate = proposalMatchups > 0 ? proposalWins / proposalMatchups : 0;
    winRates.push({ proposalId: proposal.proposalId, rate });
  }

  // Sort by win rate descending
  winRates.sort((a, b) => b.rate - a.rate);

  const [leader] = winRates;

  if (leader.rate >= threshold) {
    return {
      consensusReached: true,
      winningProposalId: leader.proposalId,
      reasoning: `Won ${(leader.rate * 100).toFixed(0)}% of matchups (threshold: ${(threshold * 100).toFixed(0)}%)`,
    };
  }

  return {
    consensusReached: false,
    reasoning: `Best win rate ${(leader.rate * 100).toFixed(0)}% below threshold ${(threshold * 100).toFixed(0)}%`,
  };
}

/** Map of built-in arbiter strategy names to functions */
export const arbiterStrategies: Record<
  string,
  (ctx: ArbiterContext) => Promise<ArbiterStrategyResult>
> = {
  firstProposal,
  aheadByK,
  mostSimilar,
  pairwiseConsensus,
};
