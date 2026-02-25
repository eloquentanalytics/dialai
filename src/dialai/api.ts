/**
 * DIAL AI Core API
 *
 * Core API functions for session management, specialist registration,
 * and the decision cycle.
 */

import { getStore } from "./store.js";
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
  machine: MachineDefinition,
  metaJson?: Record<string, unknown>
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
    metaJson,
  };

  await getStore().setSession(session);

  // Auto-register per-state specialists that have a strategyFnName (built-in strategy)
  for (const stateDef of Object.values(normalized.states)) {
    if (!stateDef.specialists) continue;
    for (const spec of stateDef.specialists) {
      if (await getStore().hasSpecialist(spec.specialistId)) continue;
      if (!spec.strategyFnName) continue;

      const machineName = spec.machineName ?? normalized.machineName;
      if (spec.role === "proposer") {
        await registerProposer({
          specialistId: spec.specialistId,
          machineName,
          isHuman: spec.isHuman,
          strategyFnName: spec.strategyFnName,
          strategyWebhookUrl: spec.strategyWebhookUrl,
          webhookTokenName: spec.webhookTokenName,
          threshold: spec.threshold,
        });
      } else if (spec.role === "arbiter") {
        await registerArbiter({
          specialistId: spec.specialistId,
          machineName,
          strategyFnName: spec.strategyFnName,
          strategyWebhookUrl: spec.strategyWebhookUrl,
          webhookTokenName: spec.webhookTokenName,
          threshold: spec.threshold,
        });
      }
    }
  }

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
  const session = await getStore().getSession(sessionId);
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
  return getStore().getAllSessions();
}

// ============================================================================
// Specialist Registration
// ============================================================================

/**
 * Validates that exactly one execution mode is specified for a proposer.
 * Checks forbidden parameter combinations and required companion parameters.
 */
function validateExecutionMode(
  opts: RegisterProposerOptions
): void {
  const hasStrategyFn = opts.strategyFn !== undefined;
  const hasStrategyFnName = opts.strategyFnName !== undefined;
  const hasStrategyWebhookUrl = opts.strategyWebhookUrl !== undefined;
  const hasContextFn = opts.contextFn !== undefined;
  const hasContextWebhookUrl = opts.contextWebhookUrl !== undefined;
  const hasModelId = opts.modelId !== undefined;
  const hasWebhookTokenName = opts.webhookTokenName !== undefined;

  // Check forbidden combinations (specific errors before generic ones)
  if (hasStrategyFn && hasStrategyFnName) {
    throw new Error(
      "Provide either strategyFn (custom function) or strategyFnName (built-in strategy), not both."
    );
  }

  if (hasStrategyFn && hasModelId) {
    throw new Error(
      "modelId is only used with contextFn or contextWebhookUrl. A strategyFn returns proposals directly and does not need a model."
    );
  }

  if (hasStrategyFnName && hasModelId) {
    throw new Error(
      "modelId is only used with contextFn or contextWebhookUrl. A strategyFnName references a built-in strategy and does not need a model."
    );
  }

  if (hasStrategyFn && hasContextFn) {
    throw new Error(
      "Provide either strategyFn (you handle everything) or contextFn + modelId (orchestrator calls the LLM), not both."
    );
  }

  if (hasContextFn && !hasModelId) {
    throw new Error(
      "contextFn provides context for an LLM to generate proposals. You must also specify modelId."
    );
  }

  if (hasContextWebhookUrl && !hasModelId) {
    throw new Error(
      "contextWebhookUrl provides context for an LLM to generate proposals. You must also specify modelId."
    );
  }

  if (hasStrategyWebhookUrl && !hasWebhookTokenName) {
    throw new Error(
      "Webhook URLs require webhookTokenName for authentication."
    );
  }

  if (hasContextWebhookUrl && !hasWebhookTokenName) {
    throw new Error(
      "Webhook URLs require webhookTokenName for authentication."
    );
  }

  // Count valid execution modes
  const modes: boolean[] = [
    hasStrategyFn,
    hasStrategyFnName,
    hasStrategyWebhookUrl,
    hasContextFn && hasModelId,
    hasContextWebhookUrl && hasModelId,
  ];

  const numModes = modes.filter(Boolean).length;

  if (numModes === 0) {
    throw new Error(
      "Specialist must specify one of: strategyFn, strategyFnName, strategyWebhookUrl, contextFn + modelId, or contextWebhookUrl + modelId."
    );
  }

  if (numModes > 1) {
    throw new Error(
      "Multiple execution modes specified for proposer. Must provide exactly one."
    );
  }
}

/**
 * Validates that exactly one execution mode is specified for arbiter.
 * Arbiters cannot use LLM-based modes.
 */
function validateArbiterExecutionMode(opts: RegisterArbiterOptions): void {
  const hasStrategyFn = opts.strategyFn !== undefined;
  const hasStrategyFnName = opts.strategyFnName !== undefined;
  const hasStrategyWebhookUrl = opts.strategyWebhookUrl !== undefined;
  const hasWebhookTokenName = opts.webhookTokenName !== undefined;

  if (hasStrategyFn && hasStrategyFnName) {
    throw new Error(
      "Provide either strategyFn (custom function) or strategyFnName (built-in strategy), not both."
    );
  }

  if (hasStrategyWebhookUrl && !hasWebhookTokenName) {
    throw new Error(
      "Webhook URLs require webhookTokenName for authentication."
    );
  }

  const modes: boolean[] = [
    hasStrategyFn,
    hasStrategyFnName,
    hasStrategyWebhookUrl,
  ];

  const numModes = modes.filter(Boolean).length;

  if (numModes === 0) {
    throw new Error(
      "Specialist must specify one of: strategyFn, strategyFnName, or strategyWebhookUrl."
    );
  }

  if (numModes > 1) {
    throw new Error(
      "Multiple execution modes specified for arbiter. Must provide exactly one."
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
  if (await getStore().hasSpecialist(opts.specialistId)) {
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

  await getStore().setSpecialist(proposer);
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
  if (await getStore().hasSpecialist(opts.specialistId)) {
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

  await getStore().setSpecialist(arbiter);
  return arbiter;
}

/**
 * Gets a specialist by ID.
 */
export async function getSpecialist(specialistId: string): Promise<(Specialist | Arbiter) | undefined> {
  return getStore().getSpecialist(specialistId);
}

/**
 * Gets all proposers for a machine.
 */
export async function getProposers(machineName: string): Promise<Proposer[]> {
  const all = await getStore().getSpecialistsByMachineAndRole(machineName, "proposer");
  return all as Proposer[];
}

/**
 * Gets the arbiter for a machine.
 */
export async function getArbiter(machineName: string): Promise<Arbiter | undefined> {
  const all = await getStore().getSpecialistsByMachineAndRole(machineName, "arbiter");
  return (all[0] as Arbiter) ?? undefined;
}

// ============================================================================
// Enable/Disable
// ============================================================================

/**
 * Enables a specialist (sets enabled = true).
 */
export async function enableSpecialist(specialistId: string): Promise<void> {
  const specialist = await getStore().getSpecialist(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }
  (specialist as Proposer | Arbiter).enabled = true;
  await getStore().setSpecialist(specialist);
}

/**
 * Disables a specialist (sets enabled = false).
 */
export async function disableSpecialist(specialistId: string): Promise<void> {
  const specialist = await getStore().getSpecialist(specialistId);
  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }
  (specialist as Proposer | Arbiter).enabled = false;
  await getStore().setSpecialist(specialist);
}

/**
 * Gets enabled proposers for a machine (enabled is true or undefined).
 */
export async function getEnabledProposers(machineName: string): Promise<Proposer[]> {
  const proposers = await getProposers(machineName);
  return proposers.filter((p) => p.enabled !== false);
}

/**
 * Gets the enabled arbiter for a machine.
 */
export async function getEnabledArbiter(machineName: string): Promise<Arbiter | undefined> {
  const arbiter = await getArbiter(machineName);
  if (arbiter && arbiter.enabled === false) return undefined;
  return arbiter;
}

// ============================================================================
// State-Aware Specialist Lookup
// ============================================================================

/**
 * Gets proposers declared in the current state's specialists array.
 * Falls back to getProposers(machineName) if state has no specialists.
 * Respects both state-level `disabled` and global `enabled` flags.
 */
export async function getProposersForState(session: Session): Promise<Proposer[]> {
  const stateDef = session.machine.states[session.currentState];
  if (!stateDef?.specialists) {
    return getProposers(session.machineName);
  }

  const result: Proposer[] = [];
  for (const spec of stateDef.specialists) {
    if (spec.role !== "proposer") continue;
    const registered = await getStore().getSpecialist(spec.specialistId);
    if (!registered || registered.role !== "proposer") continue;
    result.push(registered);
  }
  return result;
}

/**
 * Gets enabled proposers for the current state.
 * Filters out specialists that are disabled at the state level or globally.
 */
export async function getEnabledProposersForState(session: Session): Promise<Proposer[]> {
  const stateDef = session.machine.states[session.currentState];
  if (!stateDef?.specialists) {
    return getEnabledProposers(session.machineName);
  }

  // Build a set of disabled specialist IDs from state definition
  const disabledInState = new Set<string>();
  for (const spec of stateDef.specialists) {
    if (spec.disabled) disabledInState.add(spec.specialistId);
  }

  const proposers = await getProposersForState(session);
  return proposers.filter(
    (p) => p.enabled !== false && !disabledInState.has(p.specialistId)
  );
}

/**
 * Gets the arbiter declared in the current state's specialists array.
 * Falls back to getArbiter(machineName).
 */
export async function getArbiterForState(session: Session): Promise<Arbiter | undefined> {
  const stateDef = session.machine.states[session.currentState];
  if (!stateDef?.specialists) {
    return getArbiter(session.machineName);
  }

  for (const spec of stateDef.specialists) {
    if (spec.role !== "arbiter") continue;
    const registered = await getStore().getSpecialist(spec.specialistId);
    if (registered && registered.role === "arbiter") {
      return registered;
    }
  }
  // Fall back to machine-level arbiter
  return getArbiter(session.machineName);
}

/**
 * Gets the effective consensus threshold for a session's current state.
 * Priority: state > machine > arbiter. Returns undefined if none configured.
 */
export async function getEffectiveThreshold(session: Session): Promise<number | undefined> {
  const stateDef = session.machine.states[session.currentState];
  if (stateDef?.consensusThreshold !== undefined) {
    return stateDef.consensusThreshold;
  }
  if (session.machine.consensusThreshold !== undefined) {
    return session.machine.consensusThreshold;
  }
  const arbiter = await getArbiterForState(session);
  if (arbiter?.threshold !== undefined) {
    return arbiter.threshold;
  }
  return undefined;
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
    history: [...session.history],
    metaJson: session.metaJson,
  };
}

/**
 * Builds the context for an arbiter.
 */
function buildArbiterContext(
  session: Session,
  roundProposals: Proposal[],
  threshold?: number
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
    metaJson: session.metaJson,
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
  const specialist = await getStore().getSpecialist(specialistId);

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

  await getStore().setProposal(proposal);
  return proposal;
}

/**
 * Gets all proposals for a session's current round.
 */
export async function getProposalsForRound(
  sessionId: string,
  roundId: string
): Promise<Proposal[]> {
  return getStore().getProposalsByRound(sessionId, roundId);
}

/**
 * Evaluates whether consensus has been reached for a session.
 * Read-only operation - does not execute any transition.
 */
export async function evaluateConsensus(
  sessionId: string
): Promise<ConsensusResult> {
  const session = await getSession(sessionId);
  const arbiter = await getArbiterForState(session);

  if (!arbiter) {
    throw new Error(`No arbiter registered for machine: ${session.machineName}`);
  }

  const roundProposals = await getProposalsForRound(sessionId, session.currentRoundId);

  const effectiveThreshold = await getEffectiveThreshold(session);

  const ctx = buildArbiterContext(
    session,
    roundProposals,
    effectiveThreshold
  );

  // Build alignment scores for context (per-state if state has specialists)
  const stateDef = session.machine.states[session.currentState];
  const stateParam = stateDef?.specialists ? session.currentState : undefined;
  const records = await getAllAlignmentRecords(session.machineName, stateParam);
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
 * Parses the consensus margin from an alignmentMargin reasoning string.
 */
function parseConsensusMargin(reasoning: string): number | null {
  const match = reasoning.match(/margin ([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Builds and stores a DecisionRecord for monitoring.
 */
async function emitDecisionRecord(
  session: Session,
  roundId: string,
  transitionName: string,
  toState: string,
  isHuman: boolean,
  roundProposals: Proposal[],
  consensusReasoning: string | null,
  threshold: number
): Promise<void> {
  const alignmentSnapshot: Record<string, number> = {};
  for (const r of await getAllAlignmentRecords(session.machineName)) {
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

  await getStore().setDecisionRecord(record);
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
  const specialist = specialistId ? await getStore().getSpecialist(specialistId) : undefined;
  const isHuman = specialist != null && "isHuman" in specialist && specialist.isHuman === true;

  const currentStateDef = session.machine.states[session.currentState];
  const roundProposals = await getProposalsForRound(sessionId, effectiveRoundId);

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
      await createExemplar(
        session.machineName,
        session.currentState,
        proposerCtx,
        path.transitionName,
        path.toState,
        roundProposals
      );

      // Update alignment for all specialists (per-state if applicable)
      const stateHasSpecs = !!currentStateDef?.specialists;
      await updateAlignmentAfterHumanDecision(
        session.machineName,
        path.transitionName,
        roundProposals,
        stateHasSpecs ? session.currentState : undefined
      );

      // Emit decision record before executeTransition deletes proposals
      const arbiter = await getArbiterForState(session);
      await emitDecisionRecord(
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
      const winningProposal = await getStore().getProposal(consensusResult.winningProposalId!);
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
      const evalArbiter = await getArbiterForState(session);
      await emitDecisionRecord(
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
  await getStore().deleteProposalsBySession(sessionId);

  return session;
}
