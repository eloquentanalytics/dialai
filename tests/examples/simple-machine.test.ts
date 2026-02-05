import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as store from "../../src/dialai/store.js";
import {
  createSession,
  registerSpecialist,
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

  it("reaches goal state with built-in proposer", () => {
    const machine = loadSimpleMachine();
    const session = runSession(machine);

    expect(session.machineName).toBe("is-two-greater");
    expect(session.currentState).toBe("sure");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].fromState).toBe("unsure");
    expect(session.history[0].toState).toBe("sure");
  });
});

describe("simple-machine.json: mock AI proposers + voters", () => {
  beforeEach(() => store.clear());

  it("two proposers disagree, voter breaks tie, cycle completes", () => {
    const machine = loadSimpleMachine();
    const session = createSession(machine);

    expect(session.currentState).toBe("unsure");

    // Mock AI proposer 1: proposes "yes" transition
    const p1 = submitProposal(
      session.sessionId,
      "ai-proposer-1",
      "yes",
      "sure",
      "2 is greater than 1, so yes"
    );

    // Mock AI proposer 2: proposes "no" transition
    const p2 = submitProposal(
      session.sessionId,
      "ai-proposer-2",
      "no",
      "sure",
      "I am confused, so no"
    );

    // Mock AI voter: prefers proposal A (yes)
    registerSpecialist({
      specialistId: "ai-voter-1",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({
        voteFor: "A" as const,
        reasoning: "Proposal A correctly identifies 2 > 1",
      }),
    });

    solicitVote(
      session.sessionId,
      "ai-voter-1",
      p1.proposalId,
      p2.proposalId
    );

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(p1.proposalId);

    executeTransition(session.sessionId, "yes", "sure", consensus.reasoning);

    expect(session.currentState).toBe("sure");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].transitionName).toBe("yes");
  });

  it("three voters, majority wins", () => {
    const machine = loadSimpleMachine();
    const session = createSession(machine);

    const pYes = submitProposal(
      session.sessionId,
      "ai-proposer-1",
      "yes",
      "sure",
      "2 > 1 is true"
    );
    const pNo = submitProposal(
      session.sessionId,
      "ai-proposer-2",
      "no",
      "sure",
      "2 > 1 is false"
    );

    // Register three mock AI voters: 2 vote A, 1 votes B
    registerSpecialist({
      specialistId: "ai-voter-1",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "A is correct" }),
    });
    registerSpecialist({
      specialistId: "ai-voter-2",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "A is right" }),
    });
    registerSpecialist({
      specialistId: "ai-voter-3",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({ voteFor: "B" as const, reasoning: "B seems better" }),
    });

    for (const voterId of ["ai-voter-1", "ai-voter-2", "ai-voter-3"]) {
      solicitVote(
        session.sessionId,
        voterId,
        pYes.proposalId,
        pNo.proposalId
      );
    }

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(pYes.proposalId);

    executeTransition(session.sessionId, "yes", "sure", consensus.reasoning);
    expect(session.currentState).toBe("sure");
  });

  it("human voter overrides AI majority", () => {
    const machine = loadSimpleMachine();
    const session = createSession(machine);

    const pYes = submitProposal(
      session.sessionId,
      "ai-proposer-1",
      "yes",
      "sure",
      "2 > 1"
    );
    const pNo = submitProposal(
      session.sessionId,
      "ai-proposer-2",
      "no",
      "sure",
      "not sure"
    );

    // Two AI voters prefer "yes"
    registerSpecialist({
      specialistId: "ai-voter-1",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "yes" }),
    });
    registerSpecialist({
      specialistId: "ai-voter-2",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "yes" }),
    });

    // Human voter prefers "no"
    registerSpecialist({
      specialistId: "human-reviewer",
      machineName: "is-two-greater",
      role: "voter",
      strategy: () => ({ voteFor: "B" as const, reasoning: "I disagree" }),
    });

    for (const voterId of ["ai-voter-1", "ai-voter-2", "human-reviewer"]) {
      solicitVote(
        session.sessionId,
        voterId,
        pYes.proposalId,
        pNo.proposalId
      );
    }

    const consensus = evaluateConsensus(session.sessionId);
    expect(consensus.consensusReached).toBe(true);
    expect(consensus.winningProposalId).toBe(pNo.proposalId);
    expect(consensus.reasoning).toContain("human preferred");

    executeTransition(session.sessionId, "no", "sure", consensus.reasoning);
    expect(session.currentState).toBe("sure");
    expect(session.history[0].transitionName).toBe("no");
  });
});
