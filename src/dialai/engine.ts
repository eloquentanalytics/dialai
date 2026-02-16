/**
 * DIAL AI Engine
 *
 * The runSession function that drives machines through one decision cycle.
 * Implements full solicitation cascade, champion mode, trip line,
 * and self-healing.
 */

import {
  createSession,
  getSession,
  registerProposer,
  registerArbiter,
  getProposers,
  getArbiter,
  getVoters,
  getEnabledProposers,
  getEnabledVoters,
  enableSpecialist,
  submitProposal,
  submitVote,
  submitSelectionVote,
  submitArbitration,
  evaluateConsensus,
  getProposalsForRound,
} from "./api.js";
import { getAlignmentScore } from "./alignment.js";
import type {
  MachineDefinition,
  Session,
  Proposal,
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
 * Self-healing: re-enable all disabled specialists for a machine.
 */
function selfHeal(machineName: string): void {
  const allProposers = getProposers(machineName);
  const allVoters = getVoters(machineName);

  for (const p of allProposers) {
    if (p.enabled === false) {
      enableSpecialist(p.specialistId);
    }
  }
  for (const v of allVoters) {
    if (v.enabled === false) {
      enableSpecialist(v.specialistId);
    }
  }
}

/**
 * Runs a machine to completion.
 *
 * Creates a session, registers specialists (from the machine definition or
 * built-in defaults), and loops through the decision cycle until
 * currentState === goalState.
 *
 * Full solicitation cascade:
 * 1. Solicit proposals from enabled proposers -> check consensus
 * 2. Solicit selection voters -> check after each vote
 * 3. Solicit pairwise voters -> check after each vote
 * 4. If no consensus: return session in current state (exhausted, waiting for human)
 *
 * Champion mode: if one proposer's alignment > threshold, fast path.
 * Trip line: if champion's alignment degrades below threshold, revert to full cascade.
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
      } else if (spec.role === "voter") {
        const { registerVoter } = await import("./api.js");
        await registerVoter({
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

  // Main decision loop
  let currentSession = await getSession(session.sessionId);

  while (currentSession.currentState !== normalizedMachine.goalState) {
    const machineName = normalizedMachine.machineName;
    let consensusReached = false;

    // === Champion mode check ===
    const championId = selectChampion(machineName, CHAMPION_THRESHOLD);

    if (championId) {
      // Fast path: only solicit from champion
      await submitProposal(
        currentSession.sessionId,
        championId,
        currentSession.currentRoundId
      );

      // Check consensus immediately
      const consensusResult = await evaluateConsensus(currentSession.sessionId);
      if (consensusResult.consensusReached) {
        const result = await submitArbitration(
          currentSession.sessionId,
          currentSession.currentRoundId
        );
        if (result.executed) {
          // Trip line check: verify champion still above threshold
          const currentScore = getAlignmentScore(championId, machineName);
          if (currentScore < CHAMPION_THRESHOLD) {
            // Champion degraded, self-heal for next iteration
            selfHeal(machineName);
          }
          currentSession = await getSession(session.sessionId);
          continue;
        }
      }

      // Champion fast path didn't reach consensus, fall through to full cascade
      // Trip line: revert to full cascade
      selfHeal(machineName);
    }

    // === Full solicitation cascade ===

    // Step 1: Solicit proposals from all enabled proposers
    const enabledProposers = getEnabledProposers(machineName);
    for (const proposer of enabledProposers) {
      // Skip if champion already submitted in fast path above
      if (championId === proposer.specialistId) {
        const existing = getProposalsForRound(
          currentSession.sessionId,
          currentSession.currentRoundId
        );
        if (existing.some((p) => p.specialistId === championId)) {
          continue;
        }
      }
      await submitProposal(
        currentSession.sessionId,
        proposer.specialistId,
        currentSession.currentRoundId
      );
    }

    // Check consensus after proposals
    const postProposalConsensus = await evaluateConsensus(currentSession.sessionId);
    if (postProposalConsensus.consensusReached) {
      const result = await submitArbitration(
        currentSession.sessionId,
        currentSession.currentRoundId
      );
      if (result.executed) {
        currentSession = await getSession(session.sessionId);
        continue;
      }
    }

    // Step 2: Solicit selection voters
    const selectionVoters = getEnabledVoters(machineName, "selection");
    for (const voter of selectionVoters) {
      await submitSelectionVote(
        currentSession.sessionId,
        voter.specialistId,
        currentSession.currentRoundId
      );

      // Check consensus after each selection vote
      const result = await evaluateConsensus(currentSession.sessionId);
      if (result.consensusReached) {
        consensusReached = true;
        break;
      }
    }

    if (consensusReached) {
      const result = await submitArbitration(
        currentSession.sessionId,
        currentSession.currentRoundId
      );
      if (result.executed) {
        currentSession = await getSession(session.sessionId);
        continue;
      }
    }

    // Step 3: Solicit pairwise voters
    const roundProposals = getProposalsForRound(
      currentSession.sessionId,
      currentSession.currentRoundId
    );

    if (roundProposals.length >= 2) {
      const pairwiseVoters = getEnabledVoters(machineName, "pairwise");

      // Create all pairwise combinations
      const pairs: [Proposal, Proposal][] = [];
      for (let i = 0; i < roundProposals.length; i++) {
        for (let j = i + 1; j < roundProposals.length; j++) {
          pairs.push([roundProposals[i], roundProposals[j]]);
        }
      }

      // Have each voter vote on each pair, check consensus after each
      for (const voter of pairwiseVoters) {
        for (const [propA, propB] of pairs) {
          await submitVote(
            currentSession.sessionId,
            voter.specialistId,
            currentSession.currentRoundId,
            propA.proposalId,
            propB.proposalId
          );
        }

        // Check consensus after each voter
        const result = await evaluateConsensus(currentSession.sessionId);
        if (result.consensusReached) {
          consensusReached = true;
          break;
        }
      }
    }

    if (consensusReached) {
      const result = await submitArbitration(
        currentSession.sessionId,
        currentSession.currentRoundId
      );
      if (result.executed) {
        currentSession = await getSession(session.sessionId);
        continue;
      }
    }

    // Step 4: Try final arbitration
    const finalResult = await submitArbitration(
      currentSession.sessionId,
      currentSession.currentRoundId
    );

    if (finalResult.executed) {
      currentSession = await getSession(session.sessionId);
      continue;
    }

    // Exhausted — no consensus reached, waiting for human
    return currentSession;
  }

  return currentSession;
}
