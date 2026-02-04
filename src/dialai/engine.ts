import type { MachineDefinition, Session } from "./types.js";
import { specialists } from "./store.js";
import {
  createSession,
  registerSpecialist,
  solicitProposal,
  solicitVote,
  evaluateConsensus,
  executeTransition,
} from "./api.js";

export function runSession(machine: MachineDefinition): Session {
  const session = createSession(machine);

  // Register a built-in deterministic proposer that picks the first transition
  const builtInProposerId = `__builtin-proposer-${session.sessionId}`;
  registerSpecialist({
    specialistId: builtInProposerId,
    sessionTypeName: machine.sessionTypeName,
    role: "proposer",
    strategy: (_currentState: string, transitions: Record<string, string>) => {
      const name = Object.keys(transitions)[0];
      if (!name) {
        throw new Error("No transitions available from current state");
      }
      return {
        transitionName: name,
        toState: transitions[name],
        reasoning: "First available transition",
      };
    },
  });

  while (session.currentState !== machine.defaultState) {
    // Gather all proposers for this session type
    const proposers = [...specialists.values()].filter(
      (s) =>
        s.sessionTypeName === machine.sessionTypeName && s.role === "proposer"
    );

    // Solicit proposals
    const proposals = proposers.map((p) =>
      solicitProposal(session.sessionId, p.specialistId)
    );

    // If 2+ proposals, solicit pairwise votes
    if (proposals.length >= 2) {
      const voters = [...specialists.values()].filter(
        (s) =>
          s.sessionTypeName === machine.sessionTypeName && s.role === "voter"
      );
      for (let i = 0; i < proposals.length; i++) {
        for (let j = i + 1; j < proposals.length; j++) {
          for (const voter of voters) {
            solicitVote(
              session.sessionId,
              voter.specialistId,
              proposals[i].proposalId,
              proposals[j].proposalId
            );
          }
        }
      }
    }

    const consensus = evaluateConsensus(session.sessionId);
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

    executeTransition(
      session.sessionId,
      winningProposal.transitionName,
      winningProposal.toState,
      consensus.reasoning
    );
  }

  return session;
}
