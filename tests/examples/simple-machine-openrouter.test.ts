import { describe, it, expect, beforeEach } from "vitest";
import * as store from "../../src/dialai/store.js";
import {
  createSession,
  registerVoter,
  registerProposer,
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
  machineName: "branching-task",
  initialState: "pending",
  defaultState: "done",
  states: {
    pending: {
      prompt: "Should we approve or reject?",
      transitions: { approve: "done", reject: "done" },
    },
    done: {},
  },
};

describe("openrouter example: mock LLM full deliberation cycle", () => {
  beforeEach(() => store.clear());

  it("two proposers + three voters reach consensus and execute", async () => {
    const session = createSession(machine);

    // Phase 1: Simulate two AI proposers (mock LLM responses)
    const mockProposals = [
      { transitionName: "approve", reasoning: "The task is ready to approve" },
      { transitionName: "approve", reasoning: "This task meets all criteria" },
    ];

    const proposals: Proposal[] = mockProposals.map((mp, i) =>
      submitProposal(
        session.sessionId,
        `openrouter-proposer-${i + 1}`,
        mp.transitionName,
        machine.states.pending.transitions![mp.transitionName],
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
      registerVoter({
        specialistId: `openrouter-voter-${v + 1}`,
        machineName: "branching-task",
        strategyFn: async () => ({ voteFor: mv.voteFor, reasoning: mv.reasoning }),
      });
    }

    // Pairwise voting (2 proposals = 1 pair, 3 voters)
    for (let i = 0; i < proposals.length; i++) {
      for (let j = i + 1; j < proposals.length; j++) {
        for (let v = 0; v < mockVotes.length; v++) {
          await solicitVote(
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
    expect(winner.transitionName).toBe("approve");

    // Phase 4: Simulate arbiter synthesis (mock LLM)
    const arbiterReasoning =
      "All participants agree that the task should be approved.";

    // Phase 5: Execute transition
    executeTransition(
      session.sessionId,
      winner.transitionName,
      winner.toState,
      arbiterReasoning
    );

    expect(session.currentState).toBe("done");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].reasoning).toBe(arbiterReasoning);
  });

  it("proposers disagree, voters pick the correct answer", async () => {
    const session = createSession(machine);

    // Proposer 1 says approve, proposer 2 says reject
    const pApprove = submitProposal(
      session.sessionId,
      "openrouter-proposer-1",
      "approve",
      "done",
      "The task is ready"
    );
    const pReject = submitProposal(
      session.sessionId,
      "openrouter-proposer-2",
      "reject",
      "done",
      "I am uncertain about this"
    );

    // Three voters: 2 prefer A (approve), 1 prefers B (reject)
    const voterPreferences: Array<"A" | "B"> = ["A", "A", "B"];
    for (let v = 0; v < voterPreferences.length; v++) {
      registerVoter({
        specialistId: `voter-${v + 1}`,
        machineName: "branching-task",
        strategyFn: async () => ({
          voteFor: voterPreferences[v],
          reasoning: `I prefer ${voterPreferences[v]}`,
        }),
      });

      await solicitVote(
        session.sessionId,
        `voter-${v + 1}`,
        pApprove.proposalId,
        pReject.proposalId
      );
    }

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(pApprove.proposalId);

    executeTransition(session.sessionId, "approve", "done", "Majority chose approve");
    expect(session.currentState).toBe("done");
  });

  it("NEITHER votes prevent consensus", async () => {
    const session = createSession(machine);

    const pApprove = submitProposal(session.sessionId, "p-1", "approve", "done", "approve");
    const pReject = submitProposal(session.sessionId, "p-2", "reject", "done", "reject");

    // All voters vote NEITHER
    registerVoter({
      specialistId: "voter-1",
      machineName: "branching-task",
      strategyFn: async () => ({
        voteFor: "NEITHER" as const,
        reasoning: "Both proposals are inadequate",
      }),
    });

    await solicitVote(session.sessionId, "voter-1", pApprove.proposalId, pReject.proposalId);

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(false);
  });

  it("registered proposer strategies via solicitProposal", async () => {
    const session = createSession(machine);

    // Register mock LLM proposers as actual specialists
    registerProposer({
      specialistId: "mock-llm-proposer-1",
      machineName: "branching-task",
      strategyFn: async (ctx) => ({
        transitionName: "approve",
        toState: ctx.transitions["approve"],
        reasoning: "Mock LLM: task is ready",
      }),
    });

    registerProposer({
      specialistId: "mock-llm-proposer-2",
      machineName: "branching-task",
      strategyFn: async (ctx) => ({
        transitionName: "reject",
        toState: ctx.transitions["reject"],
        reasoning: "Mock LLM: I am not sure",
      }),
    });

    // Solicit proposals through the strategy interface
    const p1 = await solicitProposal(session.sessionId, "mock-llm-proposer-1");
    const p2 = await solicitProposal(session.sessionId, "mock-llm-proposer-2");

    expect(p1.transitionName).toBe("approve");
    expect(p1.reasoning).toBe("Mock LLM: task is ready");
    expect(p2.transitionName).toBe("reject");
    expect(p2.reasoning).toBe("Mock LLM: I am not sure");

    // Register a mock AI voter and complete the cycle
    registerVoter({
      specialistId: "mock-llm-voter",
      machineName: "branching-task",
      strategyFn: async () => ({
        voteFor: "A" as const,
        reasoning: "Mock LLM: approve is the correct answer",
      }),
    });

    await solicitVote(session.sessionId, "mock-llm-voter", p1.proposalId, p2.proposalId);

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(p1.proposalId);

    executeTransition(session.sessionId, p1.transitionName, p1.toState, consensus.reasoning);
    expect(session.currentState).toBe("done");
  });

  it("single proposal auto-consensus (no voters needed)", () => {
    const session = createSession(machine);

    const proposal = submitProposal(
      session.sessionId,
      "sole-proposer",
      "approve",
      "done",
      "Only one proposal submitted"
    );

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(proposal.proposalId);
    expect(consensus.reasoning).toContain("Single proposal");

    executeTransition(session.sessionId, "approve", "done", consensus.reasoning);
    expect(session.currentState).toBe("done");
  });
});
