/**
 * DIAL AI Core API
 *
 * Core API functions for session management, specialist registration,
 * and the decision cycle.
 */

import {
  sessions,
  specialists,
  proposals,
  decisionLog,
} from "./store.js";
import {
  proposerStrategies,
  arbiterStrategies,
} from "./strategies.js";
import { generateUUID, normalizeMachine } from "./utils.js";
import {
  updateAlignmentAfterHumanDecision,
  getAllAlignmentRecords,
} from "./alignment.js";
import { createExemplar } from "./exemplars.js";
import type {
  MachineDefinition,
  Session,
  Proposal,
  Proposer,
  Arbiter,
  Specialist,
  RegisterProposerOptions,
  RegisterArbiterOptions,
  ProposerContext,
  ArbiterContext,
  ConsensusResult,
  ArbitrationResult,
  ArbitrationPath,
  TransitionRecord,
  DecisionRecord,
  SubmitProposalOptions,
  SubmitArbitrationOptions,
} from "./types.js";

// ============================================================================
// Session Management
// ============================================================================

/**
 * Creates a new session instance from a machine definition.
 *
 * @param machine - The machine definition to instantiate
 * @returns The created session
 */
export async function createSession(
  machine: MachineDefinition
): Promise<Session> {
  const normalized = normalizeMachine(machine);

  const session: Session = {
    sessionId: generateUUID(),
    machineName: normalized.machineName,
    currentState: normalized.initialState,
    currentRoundId: generateUUID(),
    machine: normalized,
    history: [],
    createdAt: new Date(),
  };

  sessions.set(session.sessionId, session);
  return session;
}

/**
 * Retrieves a session by its ID.
 *
 * @param sessionId - The session ID to look up
 * @returns The session
 * @throws If session not found
 */
export async function getSession(sessionId: string): Promise<Session> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return session;
}

/**
 * Returns all stored sessions.
 *
 * @returns Array of all sessions
 */
export async function getSessions(): Promise<Session[]> {
  return [...sessions.values()];
}

// ============================================================================
// Specialist Registration
// ============================================================================

/**
 * Validates that exactly one execution mode is specified for a proposer.
 */
function validateExecutionMode(
  opts: RegisterProposerOptions
): void {
  const modes: boolean[] = [
    opts.strategyFn !== undefined,
    opts.strategyFnName !== undefined,
    opts.strategyWebhookUrl !== undefined,
    opts.contextFn !== undefined && opts.modelId !== undefined,
    opts.contextWebhookUrl !== undefined && opts.modelId !== undefined,
  ];

  const numModes = modes.filter(Boolean).length;

  if (numModes === 0) {
    throw new Error(
      `No execution mode specified for proposer. Must provide one of: strategyFn, strategyFnName, strategyWebhookUrl, contextFn+modelId, or contextWebhookUrl+modelId`
    );
  }

  if (numModes > 1) {
    throw new Error(
      `Multiple execution modes specified for proposer. Must provide exactly one.`
    );
  }
}

/**
 * Validates that exactly one execution mode is specified for arbiter.
 */
function validateArbiterExecutionMode(opts: RegisterArbiterOptions): void {
  const modes: boolean[] = [
    opts.strategyFn !== undefined,
    opts.strategyFnName !== undefined,
    opts.strategyWebhookUrl !== undefined,
  ];

  const numModes = modes.filter(Boolean).length;

  if (numModes === 0) {
    throw new Error(
      `No execution mode specified for arbiter. Must provide one of: strategyFn, strategyFnName, or strategyWebhookUrl`
    );
  }

  if (numModes > 1) {
    throw new Error(
      `Multiple execution modes specified for arbiter. Must provide exactly one.`
    );
  }
}

/**
 * Registers a proposer specialist for a machine.
 *
 * @param opts - Registration options
 * @returns The registered proposer
 */
export async function registerProposer(
  opts: RegisterProposerOptions
): Promise<Proposer> {
  if (specialists.has(opts.specialistId)) {
    throw new Error(`Specialist already exists: ${opts.specialistId}`);
  }

  validateExecutionMode(opts);

  if (opts.strategyFnName && !proposerStrategies[opts.strategyFnName]) {
    throw new Error(`Unknown proposer strategy: ${opts.strategyFnName}`);
  }

  const proposer: Proposer = {
    role: "proposer",
    specialistId: opts.specialistId,
    machineName: opts.machineName,
    isHuman: opts.isHuman,
    strategyFn: opts.strategyFn,
    strategyFnName: opts.strategyFnName,
    strategyWebhookUrl: opts.strategyWebhookUrl,
    contextFn: opts.contextFn,
    contextWebhookUrl: opts.contextWebhookUrl,
    modelId: opts.modelId,
    webhookTokenName: opts.webhookTokenName,
    threshold: opts.threshold,
  };

  specialists.set(opts.specialistId, proposer);
  return proposer;
}

/**
 * Registers an arbiter specialist for a machine.
 *
 * @param opts - Registration options
 * @returns The registered arbiter
 */
export async function registerArbiter(
  opts: RegisterArbiterOptions
): Promise<Arbiter> {
  if (specialists.has(opts.specialistId)) {
    throw new Error(`Specialist already exists: ${opts.specialistId}`);
  }

  validateArbiterExecutionMode(opts);

  if (opts.strategyFnName && !arbiterStrategies[opts.strategyFnName]) {
    throw new Error(`Unknown arbiter strategy: ${opts.strategyFnName}`);
  }

  const arbiter: Arbiter = {
    role: "arbiter",
    specialistId: opts.specialistId,
    machineName: opts.machineName,
    strategyFn: opts.strategyFn,
    strategyFnName: opts.strategyFnName,
    strategyWebhookUrl: opts.strategyWebhookUrl,
    webhookTokenName: opts.webhookTokenName,
    threshold: opts.threshold,
  };

  specialists.set(opts.specialistId, arbiter);
  return arbiter;
}

/**
 * Gets a specialist by ID.
 */
export function getSpecialist(specialistId: string): Specialist | Arbiter | undefined {
  return specialists.get(specialistId);
}

/**
 * Gets all proposers for a machine.
 */
export function getProposers(machineName: string): Proposer[] {
  return [...specialists.values()].filter(
    (s): s is Proposer => s.role === "proposer" && s.machineName === machineName
  );
}

/**
 * Gets the arbiter for a machine.
 */
export function getArbiter(machineName: string): Arbiter | undefined {
  return [...specialists.values()].find(
    (s): s is Arbiter => s.role === "arbiter" && s.machineName === machineName
  );
}

// ============================================================================
// Enable/Disable
// ============================================================================

/**
 * Enables a specialist (sets enabled = true).
 */
export function enableSpecialist(specialistId: string): void {
  const specialist = specialists.get(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }
  (specialist as Proposer | Arbiter).enabled = true;
}

/**
 * Disables a specialist (sets enabled = false).
 */
export function disableSpecialist(specialistId: string): void {
  const specialist = specialists.get(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }
  (specialist as Proposer | Arbiter).enabled = false;
}

/**
 * Gets enabled proposers for a machine (enabled is true or undefined).
 */
export function getEnabledProposers(machineName: string): Proposer[] {
  return getProposers(machineName).filter((p) => p.enabled !== false);
}

/**
 * Gets the enabled arbiter for a machine.
 */
export function getEnabledArbiter(machineName: string): Arbiter | undefined {
  const arbiter = getArbiter(machineName);
  if (arbiter && arbiter.enabled === false) return undefined;
  return arbiter;
}

// ============================================================================
// Decision Cycle Functions
// ============================================================================

/**
 * Builds the context for a proposer.
 */
function buildProposerContext(session: Session): ProposerContext {
  const currentStatedef = session.machine.states[session.currentState];
  return {
    sessionId: session.sessionId,
    currentState: session.currentState,
    prompt: currentStatedef?.prompt ?? "",
    transitions: currentStatedef?.transitions ?? {},
    history: session.history,
  };
}

/**
 * Builds the context for an arbiter.
 */
function buildArbiterContext(
  session: Session,
  roundProposals: Proposal[],
  threshold: number
): ArbiterContext {
  const currentStateDef = session.machine.states[session.currentState];
  return {
    sessionId: session.sessionId,
    roundId: session.currentRoundId,
    currentState: session.currentState,
    prompt: currentStateDef?.prompt ?? "",
    machineName: session.machineName,
    proposals: roundProposals,
    history: session.history,
    threshold,
  };
}

/**
 * Resolves a proposer's local strategy function, or null for side-effectful modes.
 */
export function resolveProposerStrategy(
  proposer: Proposer
): ((ctx: ProposerContext) => Promise<{ transitionName: string; toState: string; reasoning: string }>) | null {
  if (proposer.strategyFn) return proposer.strategyFn;

  if (proposer.strategyFnName) {
    const fn = proposerStrategies[proposer.strategyFnName];
    if (!fn) throw new Error(`Unknown proposer strategy: ${proposer.strategyFnName}`);
    return fn;
  }

  return null;
}

/**
 * Resolves an arbiter's local strategy function, or null for side-effectful modes.
 */
export function resolveArbiterStrategy(
  arbiter: Arbiter
): ((ctx: ArbiterContext) => Promise<ConsensusResult>) | null {
  if (arbiter.strategyFn) return arbiter.strategyFn;

  if (arbiter.strategyFnName) {
    const fn = arbiterStrategies[arbiter.strategyFnName];
    if (!fn) throw new Error(`Unknown arbiter strategy: ${arbiter.strategyFnName}`);
    return fn;
  }

  return null;
}

/**
 * Invokes a proposer's strategy to get a proposal.
 */
async function invokeProposerStrategy(
  proposer: Proposer,
  ctx: ProposerContext
): Promise<{ transitionName: string; toState: string; reasoning: string }> {
  const localFn = resolveProposerStrategy(proposer);
  if (localFn) return localFn(ctx);

  if (proposer.strategyWebhookUrl) {
    const { executeProposerWebhook } = await import("./llm.js");
    return executeProposerWebhook(
      proposer.strategyWebhookUrl,
      ctx,
      proposer.machineName,
      proposer.webhookTokenName
    );
  }

  if (proposer.contextFn && proposer.modelId) {
    const { executeProposerLlm } = await import("./llm.js");
    return executeProposerLlm(proposer.contextFn, proposer.modelId, ctx);
  }

  if (proposer.contextWebhookUrl && proposer.modelId) {
    const { executeContextWebhookProposer } = await import("./llm.js");
    return executeContextWebhookProposer(
      proposer.contextWebhookUrl,
      proposer.modelId,
      ctx,
      proposer.machineName,
      proposer.webhookTokenName
    );
  }

  throw new Error(`No valid execution mode for proposer: ${proposer.specialistId}`);
}

/**
 * Invokes an arbiter's strategy to evaluate consensus.
 */
async function invokeArbiterStrategy(
  arbiter: Arbiter,
  ctx: ArbiterContext
): Promise<ConsensusResult> {
  const localFn = resolveArbiterStrategy(arbiter);
  if (localFn) return localFn(ctx);

  if (arbiter.strategyWebhookUrl) {
    const { executeWebhook } = await import("./llm.js");
    return executeWebhook<ConsensusResult>(
      arbiter.strategyWebhookUrl,
      ctx,
      arbiter.machineName,
      arbiter.webhookTokenName
    );
  }

  throw new Error(`No valid execution mode for arbiter: ${arbiter.specialistId}`);
}

/**
 * Creates and stores a proposal.
 * If transitionName is omitted, invokes the specialist's registered strategy.
 */
export async function submitProposal(
  opts: SubmitProposalOptions
): Promise<Proposal> {
  const {
    sessionId,
    specialistId,
    roundId,
    transitionName,
    reasoning,
    metaJson,
    costUSD,
    latencyMsec,
    numInputTokens,
    numOutputTokens,
  } = opts;
  const session = await getSession(sessionId);
  const specialist = specialists.get(specialistId);

  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }

  if (specialist.role !== "proposer") {
    throw new Error(`Specialist ${specialistId} is not a proposer`);
  }

  const proposer = specialist;
  const effectiveRoundId = roundId ?? session.currentRoundId;
  const isHuman = proposer.isHuman ?? false;

  let finalTransitionName = transitionName;
  let finalToState: string | undefined;
  let finalReasoning = reasoning;

  // If transitionName not provided, invoke strategy
  if (!finalTransitionName) {
    const ctx = buildProposerContext(session);
    const result = await invokeProposerStrategy(proposer, ctx);
    finalTransitionName = result.transitionName;
    finalToState = result.toState;
    finalReasoning = finalReasoning ?? result.reasoning;
  } else {
    // Validate the transition
    const currentStateDef = session.machine.states[session.currentState];
    if (!currentStateDef?.transitions?.[finalTransitionName]) {
      throw new Error(
        `Invalid transition "${finalTransitionName}" from state "${session.currentState}"`
      );
    }
    finalToState = currentStateDef.transitions[finalTransitionName];
  }

  const proposal: Proposal = {
    proposalId: generateUUID(),
    sessionId,
    roundId: effectiveRoundId,
    specialistId,
    isHuman,
    transitionName: finalTransitionName,
    toState: finalToState,
    reasoning: finalReasoning ?? "",
    metaJson,
    costUSD,
    latencyMsec,
    numInputTokens,
    numOutputTokens,
    createdAt: new Date(),
  };

  proposals.set(proposal.proposalId, proposal);
  return proposal;
}

/**
 * Gets all proposals for a session's current round.
 */
export function getProposalsForRound(
  sessionId: string,
  roundId: string
): Proposal[] {
  return [...proposals.values()].filter(
    (p) => p.sessionId === sessionId && p.roundId === roundId
  );
}

/**
 * Evaluates whether consensus has been reached for a session.
 * Read-only operation - does not execute any transition.
 */
export async function evaluateConsensus(
  sessionId: string
): Promise<ConsensusResult> {
  const session = await getSession(sessionId);
  const arbiter = getArbiter(session.machineName);

  if (!arbiter) {
    throw new Error(`No arbiter registered for machine: ${session.machineName}`);
  }

  const roundProposals = getProposalsForRound(sessionId, session.currentRoundId);

  const ctx = buildArbiterContext(
    session,
    roundProposals,
    arbiter.threshold ?? 1
  );

  // Build alignment scores for context
  const records = getAllAlignmentRecords(session.machineName);
  const alignmentScores: Record<string, number> = {};
  for (const r of records) {
    alignmentScores[r.specialistId] = r.alignmentScore;
  }
  ctx.alignmentScores = alignmentScores;

  return invokeArbiterStrategy(arbiter, ctx);
}

/**
 * Pure function: classifies which path submitArbitration should take
 * based on round staleness, human status, transition validity, and proposal count.
 */
export function classifyArbitration(
  currentRoundId: string,
  effectiveRoundId: string,
  isHuman: boolean,
  transitionName: string | undefined,
  currentStateTransitions: Record<string, string> | undefined,
  proposalCount: number,
  currentState: string
): ArbitrationPath {
  if (effectiveRoundId !== currentRoundId) {
    return { type: "stale" };
  }

  if (transitionName) {
    if (!isHuman) {
      return { type: "notHuman" };
    }
    if (!currentStateTransitions?.[transitionName]) {
      return {
        type: "invalidTransition",
        reason: `Invalid transition "${transitionName}" from state "${currentState}"`,
      };
    }
    return {
      type: "humanOverride",
      transitionName,
      toState: currentStateTransitions[transitionName],
    };
  }

  if (proposalCount === 0) {
    return { type: "noProposals" };
  }

  return { type: "evaluate" };
}

/**
 * Parses the consensus margin from an aheadByK reasoning string.
 */
function parseConsensusMargin(reasoning: string): number | null {
  const match = reasoning.match(/margin ([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Builds and stores a DecisionRecord for monitoring.
 */
function emitDecisionRecord(
  session: Session,
  roundId: string,
  transitionName: string,
  toState: string,
  isHuman: boolean,
  roundProposals: Proposal[],
  consensusReasoning: string | null,
  threshold: number
): void {
  const alignmentSnapshot: Record<string, number> = {};
  for (const r of getAllAlignmentRecords(session.machineName)) {
    alignmentSnapshot[r.specialistId] = r.alignmentScore;
  }

  const record: DecisionRecord = {
    decisionId: generateUUID(),
    sessionId: session.sessionId,
    machineName: session.machineName,
    roundId,
    fromState: session.currentState,
    toState,
    transitionName,
    isHuman,
    proposals: [...roundProposals],
    alignmentSnapshot,
    consensusMargin: consensusReasoning ? parseConsensusMargin(consensusReasoning) : null,
    threshold,
    timestamp: new Date(),
  };

  decisionLog.set(record.decisionId, record);
}

/**
 * Evaluates consensus and optionally executes the winning transition.
 */
export async function submitArbitration(
  opts: SubmitArbitrationOptions
): Promise<ArbitrationResult> {
  const {
    sessionId,
    roundId,
    specialistId,
    transitionName,
    reasoning,
    metaJson,
    costUSD,
    latencyMsec,
    numInputTokens,
    numOutputTokens,
  } = opts;
  const session = await getSession(sessionId);
  const effectiveRoundId = roundId ?? session.currentRoundId;
  const arbitrationId = generateUUID();

  // Shared fields for early-return results
  const base = {
    arbitrationId,
    sessionId,
    roundId: effectiveRoundId,
    specialistId,
    metaJson,
    costUSD,
    latencyMsec,
    numInputTokens,
    numOutputTokens,
  };

  // Determine if specialist is human
  const specialist = specialistId ? specialists.get(specialistId) : undefined;
  const isHuman = specialist != null && "isHuman" in specialist && specialist.isHuman === true;

  const currentStateDef = session.machine.states[session.currentState];
  const roundProposals = getProposalsForRound(sessionId, effectiveRoundId);

  const path = classifyArbitration(
    session.currentRoundId,
    effectiveRoundId,
    isHuman,
    transitionName,
    currentStateDef?.transitions,
    roundProposals.length,
    session.currentState
  );

  switch (path.type) {
    case "stale":
      return {
        ...base,
        stale: true,
        guardsPass: false,
        guardReason: "Round ID mismatch - decision cycle already completed",
        executed: false,
        isHuman: false,
      };

    case "notHuman":
      return {
        ...base,
        stale: false,
        guardsPass: false,
        guardReason: "Only human specialists can force arbitration",
        executed: false,
        isHuman: false,
      };

    case "invalidTransition":
      return {
        ...base,
        stale: false,
        guardsPass: false,
        guardReason: path.reason,
        executed: false,
        isHuman: true,
      };

    case "humanOverride": {
      // Create exemplar from human decision
      const proposerCtx = buildProposerContext(session);
      createExemplar(
        session.machineName,
        session.currentState,
        proposerCtx,
        path.transitionName,
        path.toState,
        roundProposals
      );

      // Update alignment for all specialists
      updateAlignmentAfterHumanDecision(
        session.machineName,
        path.transitionName,
        roundProposals
      );

      // Emit decision record before executeTransition deletes proposals
      const arbiter = getArbiter(session.machineName);
      emitDecisionRecord(
        session, effectiveRoundId,
        path.transitionName, path.toState, true,
        roundProposals, null,
        arbiter?.threshold ?? 1
      );

      // Execute the forced transition
      await executeTransition(sessionId, path.transitionName, path.toState, reasoning);

      return {
        ...base,
        stale: false,
        guardsPass: true,
        guardReason: "Human override accepted",
        transitionName: path.transitionName,
        toState: path.toState,
        reasoning,
        executed: true,
        isHuman: true,
      };
    }

    case "noProposals":
      return {
        ...base,
        stale: false,
        guardsPass: false,
        guardReason: "No proposals in current round",
        executed: false,
        isHuman: false,
      };

    case "evaluate": {
      // Evaluate consensus
      const consensusResult = await evaluateConsensus(sessionId);

      if (!consensusResult.consensusReached) {
        return {
          ...base,
          stale: false,
          guardsPass: false,
          guardReason: consensusResult.reasoning,
          executed: false,
          isHuman: false,
        };
      }

      // Find the winning proposal
      const winningProposal = proposals.get(consensusResult.winningProposalId!);
      if (!winningProposal) {
        return {
          ...base,
          stale: false,
          guardsPass: false,
          guardReason: `Winning proposal not found: ${consensusResult.winningProposalId}`,
          executed: false,
          isHuman: false,
        };
      }

      // Emit decision record before executeTransition deletes proposals
      const evalArbiter = getArbiter(session.machineName);
      emitDecisionRecord(
        session, effectiveRoundId,
        winningProposal.transitionName, winningProposal.toState, false,
        roundProposals, consensusResult.reasoning,
        evalArbiter?.threshold ?? 1
      );

      // Execute the transition
      await executeTransition(
        sessionId,
        winningProposal.transitionName,
        winningProposal.toState,
        reasoning ?? winningProposal.reasoning
      );

      return {
        ...base,
        stale: false,
        guardsPass: true,
        guardReason: consensusResult.reasoning,
        winningProposalId: consensusResult.winningProposalId,
        transitionName: winningProposal.transitionName,
        toState: winningProposal.toState,
        reasoning: reasoning ?? winningProposal.reasoning,
        executed: true,
        isHuman: false,
        metaJson: metaJson ?? winningProposal.metaJson,
      };
    }
  }
}

/**
 * Executes a state transition on a session.
 */
export async function executeTransition(
  sessionId: string,
  transitionName: string,
  toState: string,
  reasoning?: string
): Promise<Session> {
  const session = await getSession(sessionId);
  const currentStateDef = session.machine.states[session.currentState];

  // Validate the transition
  if (!currentStateDef?.transitions) {
    throw new Error(
      `No transitions available from state "${session.currentState}"`
    );
  }

  if (!(transitionName in currentStateDef.transitions)) {
    throw new Error(
      `Invalid transition "${transitionName}" from state "${session.currentState}"`
    );
  }

  const expectedToState = currentStateDef.transitions[transitionName];
  if (toState !== expectedToState) {
    throw new Error(
      `State mismatch: transition "${transitionName}" should go to "${expectedToState}", not "${toState}"`
    );
  }

  // Create transition record
  const record: TransitionRecord = {
    transitionName,
    reasoning: reasoning ?? "",
    executionTimestamp: new Date(),
  };

  // Update session
  session.currentState = toState;
  session.history.push(record);
  session.currentRoundId = generateUUID();

  // Clear proposals for this session
  for (const [id, proposal] of proposals.entries()) {
    if (proposal.sessionId === sessionId) {
      proposals.delete(id);
    }
  }

  return session;
}
