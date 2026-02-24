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
  getSpecialist,
  getProposers,
  getArbiter,
  getEnabledProposers,
  getEnabledProposersForState,
  enableSpecialist,
  submitProposal,
  submitArbitration,
  evaluateConsensus,
  getProposalsForRound,
} from "./api.js";
import { getAlignmentScore } from "./alignment.js";
import type {
  MachineDefinition,
  Proposer,
  Session,
  TickResult,
} from "./types.js";

/** Default champion threshold */
const CHAMPION_THRESHOLD = 0.8;

/**
 * Selects a champion proposer — the highest-alignment proposer above threshold.
 * Returns undefined if no proposer qualifies.
 */
export async function selectChampion(
  machineName: string,
  threshold: number,
  proposers?: Proposer[],
  state?: string
): Promise<string | undefined> {
  const effectiveProposers = proposers ?? await getEnabledProposers(machineName);
  let bestId: string | undefined;
  let bestScore = -1;

  for (const p of effectiveProposers) {
    const score = await getAlignmentScore(p.specialistId, machineName, state);
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
async function selfHeal(machineName: string): Promise<void> {
  const allProposers = await getProposers(machineName);

  for (const p of allProposers) {
    if (p.enabled === false) {
      await enableSpecialist(p.specialistId);
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
  const roundProposals = await getProposalsForRound(
    session.sessionId,
    session.currentRoundId
  );
  const submitted = new Set(roundProposals.map((p) => p.specialistId));

  // Get enabled proposers (state-aware), champion-first ordering
  const enabledProposers = await getEnabledProposersForState(session);
  const stateDef = session.machine.states[session.currentState];
  const stateParam = stateDef?.specialists ? session.currentState : undefined;
  const championId = await selectChampion(machineName, CHAMPION_THRESHOLD, enabledProposers, stateParam);

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
        const currentScore = await getAlignmentScore(championId, machineName, stateParam);
        if (currentScore < CHAMPION_THRESHOLD) {
          await selfHeal(machineName);
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

  // Register specialists from machine definition (machine-level)
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

  // Register per-state specialists (deduplicated, strategyFnName only)
  for (const stateDef of Object.values(normalizedMachine.states)) {
    if (!stateDef.specialists) continue;
    for (const spec of stateDef.specialists) {
      if (await getSpecialist(spec.specialistId)) continue;
      if (!spec.strategyFnName) continue;

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
  const proposers = await getProposers(normalizedMachine.machineName);
  if (proposers.length === 0) {
    await registerProposer({
      specialistId: `__default_proposer_${session.sessionId}`,
      machineName: normalizedMachine.machineName,
      strategyFnName: "firstAvailable",
    });
  }

  // Register default arbiter if none specified (always firstProposal)
  let arbiter = await getArbiter(normalizedMachine.machineName);
  if (!arbiter) {
    await registerArbiter({
      specialistId: `__default_arbiter_${session.sessionId}`,
      machineName: normalizedMachine.machineName,
      strategyFnName: "firstProposal",
    });
    arbiter = await getArbiter(normalizedMachine.machineName);
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
