import type { MachineDefinition, Session } from "./types.js";
import { specialists } from "./store.js";
import {
  createSession,
  registerProposer,
  solicitProposal,
  solicitVote,
  evaluateConsensus,
  executeTransition,
} from "./api.js";

export async function runSession(machine: MachineDefinition): Promise<Session> {
  const session = await createSession(machine);

  // Register a built-in deterministic proposer that picks the first transition
  const builtInProposerId = `__builtin-proposer-${session.sessionId}`;
  await registerProposer({
    specialistId: builtInProposerId,
    machineName: machine.machineName,
    strategyFn: async (ctx) => {
      const name = Object.keys(ctx.transitions)[0];
      if (!name) {
        throw new Error("No transitions available from current state");
      }
      return {
        transitionName: name,
        toState: ctx.transitions[name],
        reasoning: "First available transition",
      };
    },
  });

  while (session.currentState !== machine.defaultState) {
    // Gather all proposers for this session type
    const proposers = [...specialists.values()].filter(
      (s) =>
        s.machineName === machine.machineName && s.role === "proposer"
    );

    // Solicit proposals
    const proposals = await Promise.all(
      proposers.map((p) =>
        solicitProposal(session.sessionId, p.specialistId)
      )
    );

    // If 2+ proposals, solicit pairwise votes
    if (proposals.length >= 2) {
      const voters = [...specialists.values()].filter(
        (s) =>
          s.machineName === machine.machineName && s.role === "voter"
      );
      for (let i = 0; i < proposals.length; i++) {
        for (let j = i + 1; j < proposals.length; j++) {
          for (const voter of voters) {
            await solicitVote(
              session.sessionId,
              voter.specialistId,
              proposals[i].proposalId,
              proposals[j].proposalId
            );
          }
        }
      }
    }

    const consensus = await evaluateConsensus(session.sessionId);
    if (!consensus.consensusReached || !consensus.winningProposalId) {
      throw new Error(`No consensus reached: ${consensus.reasoning}`);
    }

    // Find the winning proposal to get transition details
    const winningProposal = proposals.find(
      (p) => p.proposalId === consensus.winningProposalId
    );
    if (!winningProposal) {
      throw new Error("Winning proposal not found");
    }

    await executeTransition(
      session.sessionId,
      winningProposal.transitionName,
      winningProposal.toState,
      consensus.reasoning
    );
  }

  return session;
}
