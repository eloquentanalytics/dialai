/**
 * DIAL AI Engine
 *
 * Tick-based orchestration: one global heartbeat that sweeps all active sessions.
 * Each tick does exactly one atomic thing per session.
 *
 * Also provides runSession for convenience (loops tick() to completion).
 */

import {
  createSession,
  getSession,
  getSessions,
  registerProposer,
  registerArbiter,
  getProposers,
  getArbiter,
  getEnabledProposers,
  enableSpecialist,
  submitProposal,
  submitArbitration,
  evaluateConsensus,
  getProposalsForRound,
} from "./api.js";
import { getAlignmentScore } from "./alignment.js";
import type {
  MachineDefinition,
  Session,
  TickResult,
} from "./types.js";

/** Default champion threshold */
const CHAMPION_THRESHOLD = 0.8;

/**
 * Gets the effective consensus threshold for a session's current state.
 * Priority: state > machine > arbiter > 0.5
 */
export function getEffectiveThreshold(session: Session): number {
  const stateDef = session.machine.states[session.currentState];
  if (stateDef?.consensusThreshold !== undefined) {
    return stateDef.consensusThreshold;
  }
  if (session.machine.consensusThreshold !== undefined) {
    return session.machine.consensusThreshold;
  }
  const arbiter = getArbiter(session.machineName);
  if (arbiter?.threshold !== undefined) {
    return arbiter.threshold;
  }
  return 0.5;
}

/**
 * Selects a champion proposer — the highest-alignment proposer above threshold.
 * Returns undefined if no proposer qualifies.
 */
export function selectChampion(
  machineName: string,
  threshold: number
): string | undefined {
  const proposers = getEnabledProposers(machineName);
  let bestId: string | undefined;
  let bestScore = -1;

  for (const p of proposers) {
    const score = getAlignmentScore(p.specialistId, machineName);
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestId = p.specialistId;
    }
  }

  return bestId;
}

/**
 * Self-healing: re-enable all disabled proposers for a machine.
 */
function selfHeal(machineName: string): void {
  const allProposers = getProposers(machineName);

  for (const p of allProposers) {
    if (p.enabled === false) {
      enableSpecialist(p.specialistId);
    }
  }
}

/**
 * Process one tick for a single session.
 * Returns a TickResult, or null if the session is terminal.
 */
async function tickOneSession(session: Session): Promise<TickResult | null> {
  const { machineName } = session;

  // Terminal sessions are skipped
  if (session.currentState === session.machine.goalState) {
    return null;
  }

  // Check what's already been submitted this round
  const roundProposals = getProposalsForRound(
    session.sessionId,
    session.currentRoundId
  );
  const submitted = new Set(roundProposals.map((p) => p.specialistId));

  // Get enabled proposers, champion-first ordering
  const enabledProposers = getEnabledProposers(machineName);
  const championId = selectChampion(machineName, CHAMPION_THRESHOLD);

  const ordered = championId
    ? [
        ...enabledProposers.filter((p) => p.specialistId === championId),
        ...enabledProposers.filter((p) => p.specialistId !== championId),
      ]
    : enabledProposers;

  // Find the next proposer that hasn't submitted yet
  for (const proposer of ordered) {
    if (!submitted.has(proposer.specialistId)) {
      await submitProposal({
        sessionId: session.sessionId,
        specialistId: proposer.specialistId,
        roundId: session.currentRoundId,
      });
      return {
        sessionId: session.sessionId,
        machineName,
        status: "solicited",
        currentState: session.currentState,
        specialistId: proposer.specialistId,
      };
    }
  }

  // All proposals are in → evaluate consensus
  const consensus = await evaluateConsensus(session.sessionId);

  if (consensus.consensusReached) {
    const previousState = session.currentState;
    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
    });

    if (result.executed) {
      // Trip line: if champion degraded, self-heal
      if (championId) {
        const currentScore = getAlignmentScore(championId, machineName);
        if (currentScore < CHAMPION_THRESHOLD) {
          selfHeal(machineName);
        }
      }

      const updatedSession = await getSession(session.sessionId);
      return {
        sessionId: session.sessionId,
        machineName,
        status: "advanced",
        currentState: updatedSession.currentState,
        previousState,
        transitionName: result.transitionName,
        reasoning: result.reasoning,
      };
    }
  }

  // No consensus → needs human
  return {
    sessionId: session.sessionId,
    machineName,
    status: "needs_human",
    currentState: session.currentState,
  };
}

/**
 * Global heartbeat. Sweeps all active sessions, performing one atomic step per session.
 *
 * Per-session behavior:
 * - If a proposer hasn't submitted yet → solicit that one proposer (status: 'solicited')
 * - If all proposers submitted and consensus reached → execute transition (status: 'advanced')
 * - If all proposers submitted but no consensus → report (status: 'needs_human')
 * - Terminal sessions are omitted from results
 *
 * @returns Array of TickResult for each non-terminal session
 */
export async function tick(): Promise<TickResult[]> {
  const allSessions = await getSessions();
  const results: TickResult[] = [];

  for (const session of allSessions) {
    const result = await tickOneSession(session);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Runs a machine to completion using tick-based orchestration.
 *
 * Creates a session, registers specialists (from the machine definition or
 * built-in defaults), and loops tick() until the session reaches goalState
 * or needs human intervention.
 *
 * @param machine - The machine definition to run
 * @returns The session (completed or waiting for human)
 */
export async function runSession(
  machine: MachineDefinition
): Promise<Session> {

  // Create session (this normalizes the machine)
  const session = await createSession(machine);
  // Use the normalized machine from the session
  const normalizedMachine = session.machine;

  // Register specialists from machine definition
  if (normalizedMachine.specialists && normalizedMachine.specialists.length > 0) {
    for (const spec of normalizedMachine.specialists) {
      const machineName = spec.machineName ?? normalizedMachine.machineName;

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

  // Register default proposer if none specified
  const proposers = getProposers(normalizedMachine.machineName);
  if (proposers.length === 0) {
    await registerProposer({
      specialistId: `__default_proposer_${session.sessionId}`,
      machineName: normalizedMachine.machineName,
      strategyFnName: "firstAvailable",
    });
  }

  // Register default arbiter if none specified (always firstProposal)
  let arbiter = getArbiter(normalizedMachine.machineName);
  if (!arbiter) {
    await registerArbiter({
      specialistId: `__default_arbiter_${session.sessionId}`,
      machineName: normalizedMachine.machineName,
      strategyFnName: "firstProposal",
    });
    arbiter = getArbiter(normalizedMachine.machineName);
  }

  // Tick loop: keep ticking until session is terminal or needs human
  let done = false;
  while (!done) {
    const results = await tick();
    const mine = results.find((r) => r.sessionId === session.sessionId);
    if (!mine || mine.status === "needs_human") done = true;
    // 'solicited' → keep ticking; 'advanced' → check if terminal next tick
  }

  return getSession(session.sessionId);
}
