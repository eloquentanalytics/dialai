import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as store from "../../src/dialai/store.js";
import {
  createSession,
  registerVoter,
  submitProposal,
  solicitVote,
  evaluateConsensus,
  executeTransition,
  runSession,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

function loadSimpleMachine(): MachineDefinition {
  const filePath = resolve(
    import.meta.dirname,
    "../../examples/simple-machine.json"
  );
  return JSON.parse(readFileSync(filePath, "utf-8")) as MachineDefinition;
}

describe("simple-machine.json: single proposer via runSession", () => {
  beforeEach(() => store.clear());

  it("reaches goal state with built-in proposer", async () => {
    const machine = loadSimpleMachine();
    const session = await runSession(machine);

    expect(session.machineName).toBe("simple-task");
    expect(session.currentState).toBe("done");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].fromState).toBe("pending");
    expect(session.history[0].toState).toBe("done");
  });
});

describe("simple-machine: mock AI proposers + voters", () => {
  beforeEach(() => store.clear());

  // Use an inline branching machine for disagreement scenarios
  const branchingMachine: MachineDefinition = {
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

  it("two proposers disagree, voter breaks tie, cycle completes", async () => {
    const session = createSession(branchingMachine);

    expect(session.currentState).toBe("pending");

    // Mock AI proposer 1: proposes "approve" transition
    const p1 = submitProposal(
      session.sessionId,
      "ai-proposer-1",
      "approve",
      "done",
      "Task looks good, approve it"
    );

    // Mock AI proposer 2: proposes "reject" transition
    const p2 = submitProposal(
      session.sessionId,
      "ai-proposer-2",
      "reject",
      "done",
      "I have concerns, reject it"
    );

    // Mock AI voter: prefers proposal A (approve)
    registerVoter({
      specialistId: "ai-voter-1",
      machineName: "branching-task",
      strategyFn: async () => ({
        voteFor: "A" as const,
        reasoning: "Proposal A correctly approves the task",
      }),
    });

    await solicitVote(
      session.sessionId,
      "ai-voter-1",
      p1.proposalId,
      p2.proposalId
    );

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(p1.proposalId);

    executeTransition(session.sessionId, "approve", "done", consensus.reasoning);

    expect(session.currentState).toBe("done");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].transitionName).toBe("approve");
  });

  it("three voters, majority wins", async () => {
    const session = createSession(branchingMachine);

    const pApprove = submitProposal(
      session.sessionId,
      "ai-proposer-1",
      "approve",
      "done",
      "Task is ready"
    );
    const pReject = submitProposal(
      session.sessionId,
      "ai-proposer-2",
      "reject",
      "done",
      "Task needs more work"
    );

    // Register three mock AI voters: 2 vote A, 1 votes B
    registerVoter({
      specialistId: "ai-voter-1",
      machineName: "branching-task",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "A is correct" }),
    });
    registerVoter({
      specialistId: "ai-voter-2",
      machineName: "branching-task",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "A is right" }),
    });
    registerVoter({
      specialistId: "ai-voter-3",
      machineName: "branching-task",
      strategyFn: async () => ({ voteFor: "B" as const, reasoning: "B seems better" }),
    });

    for (const voterId of ["ai-voter-1", "ai-voter-2", "ai-voter-3"]) {
      await solicitVote(
        session.sessionId,
        voterId,
        pApprove.proposalId,
        pReject.proposalId
      );
    }

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(pApprove.proposalId);

    executeTransition(session.sessionId, "approve", "done", consensus.reasoning);
    expect(session.currentState).toBe("done");
  });

  it("human voter overrides AI majority", async () => {
    const session = createSession(branchingMachine);

    const pApprove = submitProposal(
      session.sessionId,
      "ai-proposer-1",
      "approve",
      "done",
      "Approve it"
    );
    const pReject = submitProposal(
      session.sessionId,
      "ai-proposer-2",
      "reject",
      "done",
      "Not sure"
    );

    // Two AI voters prefer "approve"
    registerVoter({
      specialistId: "ai-voter-1",
      machineName: "branching-task",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "approve" }),
    });
    registerVoter({
      specialistId: "ai-voter-2",
      machineName: "branching-task",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "approve" }),
    });

    // Human voter prefers "reject"
    registerVoter({
      specialistId: "human-reviewer",
      machineName: "branching-task",
      strategyFn: async () => ({ voteFor: "B" as const, reasoning: "I disagree" }),
    });

    for (const voterId of ["ai-voter-1", "ai-voter-2", "human-reviewer"]) {
      await solicitVote(
        session.sessionId,
        voterId,
        pApprove.proposalId,
        pReject.proposalId
      );
    }

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(pReject.proposalId);
    expect(consensus.reasoning).toContain("human preferred");

    executeTransition(session.sessionId, "reject", "done", consensus.reasoning);
    expect(session.currentState).toBe("done");
    expect(session.history[0].transitionName).toBe("reject");
  });
});
