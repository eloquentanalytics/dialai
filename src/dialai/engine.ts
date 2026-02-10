/**
 * DIAL AI Engine
 *
 * The runSession function that drives machines to completion.
 */

import {
  createSession,
  getSession,
  registerProposer,
  registerArbiter,
  getProposers,
  getArbiter,
  getVoters,
  submitProposal,
  submitVote,
  submitArbitration,
  getProposalsForRound,
} from "./api.js";
import type { MachineDefinition, Session, Proposal } from "./types.js";

/** Maximum iterations to prevent infinite loops */
const MAX_ITERATIONS = 1000;

/**
 * Runs a machine to completion.
 *
 * Creates a session, registers specialists (from the machine definition or
 * built-in defaults), and loops through the decision cycle until
 * currentState === goalState.
 *
 * @param machine - The machine definition to run
 * @returns The completed session
 */
export async function runSession(machine: MachineDefinition): Promise<Session> {
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
        // Import registerVoter is already done above
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

  // Register default arbiter if none specified
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
  let iterations = 0;
  let currentSession = await getSession(session.sessionId);

  while (currentSession.currentState !== normalizedMachine.goalState) {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      throw new Error(`Max iterations (${MAX_ITERATIONS}) exceeded`);
    }

    // Get all proposers for this machine
    const allProposers = getProposers(normalizedMachine.machineName);

    // Solicit proposals from all proposers
    for (const proposer of allProposers) {
      await submitProposal(
        currentSession.sessionId,
        proposer.specialistId,
        currentSession.currentRoundId
      );
    }

    // Get proposals for this round
    const roundProposals = getProposalsForRound(
      currentSession.sessionId,
      currentSession.currentRoundId
    );

    // If 2+ proposals, solicit pairwise votes
    if (roundProposals.length >= 2) {
      const voters = getVoters(normalizedMachine.machineName);

      // Create all pairwise combinations
      const pairs: [Proposal, Proposal][] = [];
      for (let i = 0; i < roundProposals.length; i++) {
        for (let j = i + 1; j < roundProposals.length; j++) {
          pairs.push([roundProposals[i], roundProposals[j]]);
        }
      }

      // Have each voter vote on each pair
      for (const voter of voters) {
        for (const [propA, propB] of pairs) {
          await submitVote(
            currentSession.sessionId,
            voter.specialistId,
            currentSession.currentRoundId,
            propA.proposalId,
            propB.proposalId
          );
        }
      }
    }

    // Submit arbitration (evaluate consensus and execute if reached)
    const result = await submitArbitration(
      currentSession.sessionId,
      currentSession.currentRoundId
    );

    if (!result.executed) {
      // If no consensus reached, try human override or throw
      throw new Error(`No consensus reached: ${result.guardReason}`);
    }

    // Refresh session state
    currentSession = await getSession(session.sessionId);
  }

  return currentSession;
}
