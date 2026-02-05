import { describe, it, expect, beforeEach } from "vitest";
import * as store from "../../src/dialai/store.js";
import {
  createSession,
  registerSpecialist,
  submitProposal,
  solicitProposal,
  solicitVote,
  evaluateConsensus,
  executeTransition,
} from "../../src/dialai/index.js";
import type { MachineDefinition, Proposal } from "../../src/dialai/types.js";

/**
 * These tests exercise the same machine and flow as
 * examples/simple-machine-openrouter.ts but replace the LLM calls with
 * deterministic mock strategies so no network or API key is required.
 */

const machine: MachineDefinition = {
  machineName: "is-two-greater",
  initialState: "unsure",
  defaultState: "sure",
  states: {
    unsure: {
      prompt: "Is 2 > 1?",
      transitions: { yes: "sure", no: "sure" },
    },
    sure: {},
  },
};

describe("openrouter example: mock LLM full deliberation cycle", () => {
  beforeEach(() => store.clear());

  it("two proposers + three voters reach consensus and execute", () => {
    const session = createSession(machine);

    // Phase 1: Simulate two AI proposers (mock LLM responses)
    const mockProposals = [
      { transitionName: "yes", reasoning: "2 is greater than 1 by basic arithmetic" },
      { transitionName: "yes", reasoning: "This is a fundamental mathematical truth" },
    ];

    const proposals: Proposal[] = mockProposals.map((mp, i) =>
      submitProposal(
        session.sessionId,
        `openrouter-proposer-${i + 1}`,
        mp.transitionName,
        machine.states.unsure.transitions![mp.transitionName],
        mp.reasoning
      )
    );

    expect(proposals).toHaveLength(2);

    // Phase 2: Simulate three AI voters with mock LLM responses
    const mockVotes: Array<{ voteFor: "A" | "B" | "BOTH" | "NEITHER"; reasoning: string }> = [
      { voteFor: "BOTH", reasoning: "Both proposals reach the same conclusion" },
      { voteFor: "A", reasoning: "Proposer 1 has clearer reasoning" },
      { voteFor: "A", reasoning: "First proposal is more precise" },
    ];

    for (let v = 0; v < mockVotes.length; v++) {
      const mv = mockVotes[v];
      registerSpecialist({
        specialistId: `openrouter-voter-${v + 1}`,
        machineName: "is-two-greater",
        role: "voter",
        strategy: () => ({ voteFor: mv.voteFor, reasoning: mv.reasoning }),
      });
    }

    // Pairwise voting (2 proposals = 1 pair, 3 voters)
    for (let i = 0; i < proposals.length; i++) {
      for (let j = i + 1; j < proposals.length; j++) {
        for (let v = 0; v < mockVotes.length; v++) {
          solicitVote(
            session.sessionId,
            `openrouter-voter-${v + 1}`,
            proposals[i].proposalId,
            proposals[j].proposalId
          );
        }
      }
    }

    // Phase 3: Evaluate consensus
    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBeDefined();

    const winner = proposals.find(
      (p) => p.proposalId === consensus.winningProposalId
    )!;
    expect(winner.transitionName).toBe("yes");

    // Phase 4: Simulate arbiter synthesis (mock LLM)
    const arbiterReasoning =
      "All participants agree that 2 > 1 is a mathematical fact.";

    // Phase 5: Execute transition
    executeTransition(
      session.sessionId,
      winner.transitionName,
      winner.toState,
      arbiterReasoning
    );

    expect(session.currentState).toBe("sure");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].reasoning).toBe(arbiterReasoning);
  });

  it("proposers disagree, voters pick the correct answer", () => {
    const session = createSession(machine);

    // Proposer 1 says yes, proposer 2 says no
    const pYes = submitProposal(
      session.sessionId,
      "openrouter-proposer-1",
      "yes",
      "sure",
      "2 > 1 is obviously true"
    );
    const pNo = submitProposal(
      session.sessionId,
      "openrouter-proposer-2",
      "no",
      "sure",
      "I am uncertain about this"
    );

    // Three voters: 2 prefer A (yes), 1 prefers B (no)
    const voterPreferences: Array<"A" | "B"> = ["A", "A", "B"];
    for (let v = 0; v < voterPreferences.length; v++) {
      registerSpecialist({
        specialistId: `voter-${v + 1}`,
        machineName: "is-two-greater",
        role: "voter",
        strategy: () => ({
          voteFor: voterPreferences[v],
          reasoning: `I prefer ${voterPreferences[v]}`,
        }),
      });

      solicitVote(
        session.sessionId,
        `voter-${v + 1}`,
        pYes.proposalId,
        pNo.proposalId
      );
    }

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(pYes.proposalId);

    executeTransition(session.sessionId, "yes", "sure", "Majority chose yes");
    expect(session.currentState).toBe("sure");
  });

  it("NEITHER votes prevent consensus", () => {
    const session = createSession(machine);

    const pYes = submitProposal(session.sessionId, "p-1", "yes", "sure", "yes");
    const pNo = submitProposal(session.sessionId, "p-2", "no", "sure", "no");

    // All voters vote NEITHER
    registerSpecialist({
      specialistId: "voter-1",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({
        voteFor: "NEITHER" as const,
        reasoning: "Both proposals are inadequate",
      }),
    });

    solicitVote(session.sessionId, "voter-1", pYes.proposalId, pNo.proposalId);

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(false);
  });

  it("registered proposer strategies via solicitProposal", () => {
    const session = createSession(machine);

    // Register mock LLM proposers as actual specialists
    registerSpecialist({
      specialistId: "mock-llm-proposer-1",
      machineName: "is-two-greater",
      role: "proposer",
      strategy: (_state: string, transitions: Record<string, string>) => ({
        transitionName: "yes",
        toState: transitions["yes"],
        reasoning: "Mock LLM: 2 > 1 is true",
      }),
    });

    registerSpecialist({
      specialistId: "mock-llm-proposer-2",
      machineName: "is-two-greater",
      role: "proposer",
      strategy: (_state: string, transitions: Record<string, string>) => ({
        transitionName: "no",
        toState: transitions["no"],
        reasoning: "Mock LLM: I am not sure",
      }),
    });

    // Solicit proposals through the strategy interface
    const p1 = solicitProposal(session.sessionId, "mock-llm-proposer-1");
    const p2 = solicitProposal(session.sessionId, "mock-llm-proposer-2");

    expect(p1.transitionName).toBe("yes");
    expect(p1.reasoning).toBe("Mock LLM: 2 > 1 is true");
    expect(p2.transitionName).toBe("no");
    expect(p2.reasoning).toBe("Mock LLM: I am not sure");

    // Register a mock AI voter and complete the cycle
    registerSpecialist({
      specialistId: "mock-llm-voter",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({
        voteFor: "A" as const,
        reasoning: "Mock LLM: yes is the correct answer",
      }),
    });

    solicitVote(session.sessionId, "mock-llm-voter", p1.proposalId, p2.proposalId);

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(p1.proposalId);

    executeTransition(session.sessionId, p1.transitionName, p1.toState, consensus.reasoning);
    expect(session.currentState).toBe("sure");
  });

  it("single proposal auto-consensus (no voters needed)", () => {
    const session = createSession(machine);

    const proposal = submitProposal(
      session.sessionId,
      "sole-proposer",
      "yes",
      "sure",
      "Only one proposal submitted"
    );

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(proposal.proposalId);
    expect(consensus.reasoning).toContain("Single proposal");

    executeTransition(session.sessionId, "yes", "sure", consensus.reasoning);
    expect(session.currentState).toBe("sure");
  });
});
