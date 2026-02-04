import type {
  MachineDefinition,
  Session,
  Specialist,
  Proposal,
  Vote,
  ConsensusResult,
  ProposerStrategy,
  VoterStrategy,
} from "./types.js";
import { sessions, specialists, proposals, votes } from "./store.js";

export function createSession(machine: MachineDefinition): Session {
  const session: Session = {
    sessionId: crypto.randomUUID(),
    sessionTypeName: machine.sessionTypeName,
    currentState: machine.initialState,
    machine,
    history: [],
    createdAt: new Date(),
  };
  sessions.set(session.sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return session;
}

export function getSessions(): Session[] {
  return [...sessions.values()];
}

export function registerSpecialist(opts: {
  specialistId: string;
  sessionTypeName: string;
  role: "proposer" | "voter" | "arbiter";
  weight?: number;
  strategy: ProposerStrategy | VoterStrategy;
}): Specialist {
  const specialist: Specialist = {
    specialistId: opts.specialistId,
    sessionTypeName: opts.sessionTypeName,
    role: opts.role,
    weight: opts.weight ?? 1.0,
    strategy: opts.strategy,
  };
  specialists.set(specialist.specialistId, specialist);
  return specialist;
}

export function submitProposal(
  sessionId: string,
  specialistId: string,
  transitionName: string,
  toState: string,
  reasoning?: string
): Proposal {
  const proposal: Proposal = {
    proposalId: crypto.randomUUID(),
    sessionId,
    specialistId,
    transitionName,
    toState,
    reasoning: reasoning ?? "",
  };
  proposals.set(proposal.proposalId, proposal);
  return proposal;
}

export function solicitProposal(
  sessionId: string,
  specialistId: string
): Proposal {
  const session = getSession(sessionId);
  const specialist = specialists.get(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }
  const stateConfig = session.machine.states[session.currentState];
  const transitions = stateConfig?.transitions ?? {};
  const strategy = specialist.strategy as ProposerStrategy;
  const result = strategy(session.currentState, transitions);
  return submitProposal(
    sessionId,
    specialistId,
    result.transitionName,
    result.toState,
    result.reasoning
  );
}

export function submitVote(
  sessionId: string,
  specialistId: string,
  proposalIdA: string,
  proposalIdB: string,
  voteFor: "A" | "B" | "BOTH" | "NEITHER",
  reasoning?: string
): Vote {
  const vote: Vote = {
    voteId: crypto.randomUUID(),
    sessionId,
    specialistId,
    proposalIdA,
    proposalIdB,
    voteFor,
    reasoning: reasoning ?? "",
  };
  votes.set(vote.voteId, vote);
  return vote;
}

export function solicitVote(
  sessionId: string,
  specialistId: string,
  proposalIdA: string,
  proposalIdB: string
): Vote {
  const specialist = specialists.get(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }
  const pA = proposals.get(proposalIdA);
  const pB = proposals.get(proposalIdB);
  if (!pA || !pB) {
    throw new Error("Proposal not found");
  }
  const strategy = specialist.strategy as VoterStrategy;
  const result = strategy(pA, pB);
  return submitVote(
    sessionId,
    specialistId,
    proposalIdA,
    proposalIdB,
    result.voteFor,
    result.reasoning
  );
}

export function evaluateConsensus(sessionId: string): ConsensusResult {
  const sessionProposals = [...proposals.values()].filter(
    (p) => p.sessionId === sessionId
  );

  if (sessionProposals.length === 0) {
    return { consensusReached: false, reasoning: "No proposals submitted" };
  }

  if (sessionProposals.length === 1) {
    return {
      consensusReached: true,
      winningProposalId: sessionProposals[0].proposalId,
      reasoning: "Single proposal — auto-consensus",
    };
  }

  // 2+ proposals: gather votes
  const sessionVotes = [...votes.values()].filter(
    (v) => v.sessionId === sessionId
  );

  // Check for human voter override
  for (const vote of sessionVotes) {
    if (vote.specialistId.toLowerCase().includes("human")) {
      if (vote.voteFor === "A") {
        const preferred = proposals.get(vote.proposalIdA);
        return {
          consensusReached: true,
          winningProposalId: vote.proposalIdA,
          reasoning: `The human preferred: ${preferred?.toState ?? vote.proposalIdA}`,
        };
      }
      if (vote.voteFor === "B") {
        const preferred = proposals.get(vote.proposalIdB);
        return {
          consensusReached: true,
          winningProposalId: vote.proposalIdB,
          reasoning: `The human preferred: ${preferred?.toState ?? vote.proposalIdB}`,
        };
      }
    }
  }

  // Tally weighted votes per proposal
  const tally = new Map<string, number>();
  for (const p of sessionProposals) {
    tally.set(p.proposalId, 0);
  }

  for (const vote of sessionVotes) {
    const specialist = specialists.get(vote.specialistId);
    const weight = specialist?.weight ?? 1.0;

    if (vote.voteFor === "A") {
      tally.set(vote.proposalIdA, (tally.get(vote.proposalIdA) ?? 0) + weight);
    } else if (vote.voteFor === "B") {
      tally.set(vote.proposalIdB, (tally.get(vote.proposalIdB) ?? 0) + weight);
    } else if (vote.voteFor === "BOTH") {
      tally.set(vote.proposalIdA, (tally.get(vote.proposalIdA) ?? 0) + weight);
      tally.set(vote.proposalIdB, (tally.get(vote.proposalIdB) ?? 0) + weight);
    }
    // NEITHER: no points added
  }

  // Find leader and runner-up
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const [leaderId, leaderScore] = sorted[0];
  const runnerUpScore = sorted.length > 1 ? sorted[1][1] : 0;

  if (leaderScore - runnerUpScore >= 1.0) {
    return {
      consensusReached: true,
      winningProposalId: leaderId,
      reasoning: `Leading proposal ahead by ${leaderScore - runnerUpScore} weighted votes`,
    };
  }

  return {
    consensusReached: false,
    reasoning: `No proposal leads by required margin (gap: ${leaderScore - runnerUpScore})`,
  };
}

export function executeTransition(
  sessionId: string,
  transitionName: string,
  toState: string,
  reasoning?: string
): Session {
  const session = getSession(sessionId);
  const stateConfig = session.machine.states[session.currentState];
  const transitions = stateConfig?.transitions ?? {};

  if (transitions[transitionName] !== toState) {
    throw new Error(
      `Invalid transition "${transitionName}" from state "${session.currentState}"`
    );
  }

  session.history.push({
    fromState: session.currentState,
    toState,
    transitionName,
    reasoning: reasoning ?? "",
    timestamp: new Date(),
  });

  session.currentState = toState;

  // Clear proposals and votes for this session
  for (const [id, p] of proposals) {
    if (p.sessionId === sessionId) proposals.delete(id);
  }
  for (const [id, v] of votes) {
    if (v.sessionId === sessionId) votes.delete(id);
  }

  return session;
}
