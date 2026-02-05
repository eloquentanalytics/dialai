import type {
  MachineDefinition,
  Session,
  Proposer,
  Voter,
  Arbiter,
  Proposal,
  Vote,
  ConsensusResult,
  ProposerContext,
  VoterContext,
} from "./types.js";
import { sessions, specialists, proposals, votes } from "./store.js";

export function createSession(machine: MachineDefinition): Session {
  const session: Session = {
    sessionId: crypto.randomUUID(),
    machineName: machine.machineName,
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

function validateExecutionMode(opts: {
  strategyFn?: unknown;
  strategyWebhookUrl?: string;
  modelId?: string;
  contextFn?: unknown;
  contextWebhookUrl?: string;
}): void {
  const hasStrategyFn = opts.strategyFn !== undefined;
  const hasStrategyWebhook = opts.strategyWebhookUrl !== undefined;
  const hasModelId = opts.modelId !== undefined;

  const modes = [hasStrategyFn, hasStrategyWebhook, hasModelId].filter(Boolean);
  if (modes.length > 1) {
    throw new Error(
      "Exactly one execution mode must be specified: strategyFn, strategyWebhookUrl, or modelId"
    );
  }

  if (opts.contextFn && opts.contextWebhookUrl) {
    throw new Error(
      "Cannot specify both contextFn and contextWebhookUrl"
    );
  }
}

export function registerProposer(opts: {
  specialistId: string;
  machineName: string;
  strategyFn?: Proposer["strategyFn"];
  strategyWebhookUrl?: string;
  contextFn?: Proposer["contextFn"];
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
}): Proposer {
  validateExecutionMode(opts);
  const proposer: Proposer = {
    role: "proposer",
    specialistId: opts.specialistId,
    machineName: opts.machineName,
    strategyFn: opts.strategyFn,
    strategyWebhookUrl: opts.strategyWebhookUrl,
    contextFn: opts.contextFn,
    contextWebhookUrl: opts.contextWebhookUrl,
    modelId: opts.modelId,
    webhookTokenName: opts.webhookTokenName,
  };
  specialists.set(proposer.specialistId, proposer);
  return proposer;
}

export function registerVoter(opts: {
  specialistId: string;
  machineName: string;
  strategyFn?: Voter["strategyFn"];
  strategyWebhookUrl?: string;
  contextFn?: Voter["contextFn"];
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
}): Voter {
  validateExecutionMode(opts);
  const voter: Voter = {
    role: "voter",
    specialistId: opts.specialistId,
    machineName: opts.machineName,
    strategyFn: opts.strategyFn,
    strategyWebhookUrl: opts.strategyWebhookUrl,
    contextFn: opts.contextFn,
    contextWebhookUrl: opts.contextWebhookUrl,
    modelId: opts.modelId,
    webhookTokenName: opts.webhookTokenName,
  };
  specialists.set(voter.specialistId, voter);
  return voter;
}

export function registerArbiter(opts: {
  specialistId: string;
  machineName: string;
  strategyFn?: Arbiter["strategyFn"];
  strategyWebhookUrl?: string;
  contextFn?: Arbiter["contextFn"];
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
}): Arbiter {
  validateExecutionMode(opts);
  const arbiter: Arbiter = {
    role: "arbiter",
    specialistId: opts.specialistId,
    machineName: opts.machineName,
    strategyFn: opts.strategyFn,
    strategyWebhookUrl: opts.strategyWebhookUrl,
    contextFn: opts.contextFn,
    contextWebhookUrl: opts.contextWebhookUrl,
    modelId: opts.modelId,
    webhookTokenName: opts.webhookTokenName,
  };
  specialists.set(arbiter.specialistId, arbiter);
  return arbiter;
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

export async function solicitProposal(
  sessionId: string,
  specialistId: string
): Promise<Proposal> {
  const session = getSession(sessionId);
  const specialist = specialists.get(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }
  if (specialist.role !== "proposer") {
    throw new Error(`Specialist ${specialistId} is not a proposer`);
  }

  const stateConfig = session.machine.states[session.currentState];
  const transitions = stateConfig?.transitions ?? {};
  const prompt = stateConfig?.prompt ?? "";

  const ctx: ProposerContext = {
    sessionId,
    currentState: session.currentState,
    prompt,
    transitions,
    history: session.history,
  };

  if (specialist.strategyFn) {
    const result = await specialist.strategyFn(ctx);
    return submitProposal(
      sessionId,
      specialistId,
      result.transitionName,
      result.toState,
      result.reasoning
    );
  }

  if (specialist.strategyWebhookUrl) {
    throw new Error("strategyWebhookUrl execution mode is not yet implemented");
  }

  if (specialist.modelId) {
    throw new Error("modelId execution mode is not yet implemented");
  }

  throw new Error(
    `Proposer ${specialistId} has no execution mode configured (strategyFn, strategyWebhookUrl, or modelId)`
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

export async function solicitVote(
  sessionId: string,
  specialistId: string,
  proposalIdA: string,
  proposalIdB: string
): Promise<Vote> {
  const session = getSession(sessionId);
  const specialist = specialists.get(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }
  if (specialist.role !== "voter") {
    throw new Error(`Specialist ${specialistId} is not a voter`);
  }

  const pA = proposals.get(proposalIdA);
  const pB = proposals.get(proposalIdB);
  if (!pA || !pB) {
    throw new Error("Proposal not found");
  }

  const stateConfig = session.machine.states[session.currentState];
  const prompt = stateConfig?.prompt ?? "";

  const ctx: VoterContext = {
    sessionId,
    currentState: session.currentState,
    prompt,
    proposalA: pA,
    proposalB: pB,
    history: session.history,
  };

  if (specialist.strategyFn) {
    const result = await specialist.strategyFn(ctx);
    return submitVote(
      sessionId,
      specialistId,
      proposalIdA,
      proposalIdB,
      result.voteFor,
      result.reasoning
    );
  }

  if (specialist.strategyWebhookUrl) {
    throw new Error("strategyWebhookUrl execution mode is not yet implemented");
  }

  if (specialist.modelId) {
    throw new Error("modelId execution mode is not yet implemented");
  }

  throw new Error(
    `Voter ${specialistId} has no execution mode configured (strategyFn, strategyWebhookUrl, or modelId)`
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

  // Tally votes per proposal (equal weight, +1 each)
  const tally = new Map<string, number>();
  for (const p of sessionProposals) {
    tally.set(p.proposalId, 0);
  }

  for (const vote of sessionVotes) {
    if (vote.voteFor === "A") {
      tally.set(vote.proposalIdA, (tally.get(vote.proposalIdA) ?? 0) + 1);
    } else if (vote.voteFor === "B") {
      tally.set(vote.proposalIdB, (tally.get(vote.proposalIdB) ?? 0) + 1);
    } else if (vote.voteFor === "BOTH") {
      tally.set(vote.proposalIdA, (tally.get(vote.proposalIdA) ?? 0) + 1);
      tally.set(vote.proposalIdB, (tally.get(vote.proposalIdB) ?? 0) + 1);
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
      reasoning: `Leading proposal ahead by ${leaderScore - runnerUpScore} votes`,
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
