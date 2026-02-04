import { describe, it, expect, beforeEach } from "vitest";
import * as store from "./store.js";
import {
  createSession,
  getSession,
  getSessions,
  registerSpecialist,
  submitProposal,
  solicitProposal,
  submitVote,
  solicitVote,
  evaluateConsensus,
  executeTransition,
} from "./api.js";
import type { MachineDefinition } from "./types.js";

const simpleMachine: MachineDefinition = {
  sessionTypeName: "simple-task",
  initialState: "pending",
  defaultState: "done",
  states: {
    pending: {
      prompt: "Should we complete this task?",
      transitions: { complete: "done" },
    },
    done: {},
  },
};

describe("createSession", () => {
  beforeEach(() => store.clear());

  it("creates with correct initial state and generates UUID", () => {
    const session = createSession(simpleMachine);
    expect(session.currentState).toBe("pending");
    expect(session.sessionTypeName).toBe("simple-task");
    expect(session.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(session.machine).toBe(simpleMachine);
    expect(session.createdAt).toBeInstanceOf(Date);
  });
});

describe("getSession", () => {
  beforeEach(() => store.clear());

  it("returns stored session", () => {
    const session = createSession(simpleMachine);
    const fetched = getSession(session.sessionId);
    expect(fetched).toBe(session);
  });

  it("throws on unknown ID", () => {
    expect(() => getSession("nonexistent")).toThrow("Session not found");
  });
});

describe("getSessions", () => {
  beforeEach(() => store.clear());

  it("returns all sessions", () => {
    createSession(simpleMachine);
    createSession(simpleMachine);
    expect(getSessions()).toHaveLength(2);
  });

  it("returns [] when empty", () => {
    expect(getSessions()).toEqual([]);
  });
});

describe("registerSpecialist", () => {
  beforeEach(() => store.clear());

  it("stores with strategy and defaults weight to 1.0", () => {
    const strategy = () => ({
      transitionName: "complete",
      toState: "done",
      reasoning: "test",
    });
    const spec = registerSpecialist({
      specialistId: "sp-1",
      sessionTypeName: "simple-task",
      role: "proposer",
      strategy,
    });
    expect(spec.weight).toBe(1.0);
    expect(spec.strategy).toBe(strategy);
    expect(store.specialists.get("sp-1")).toBe(spec);
  });
});

describe("submitProposal", () => {
  beforeEach(() => store.clear());

  it("creates with UUID and stores", () => {
    const session = createSession(simpleMachine);
    const proposal = submitProposal(
      session.sessionId,
      "sp-1",
      "complete",
      "done",
      "because"
    );
    expect(proposal.proposalId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(proposal.sessionId).toBe(session.sessionId);
    expect(proposal.transitionName).toBe("complete");
    expect(store.proposals.get(proposal.proposalId)).toBe(proposal);
  });
});

describe("solicitProposal", () => {
  beforeEach(() => store.clear());

  it("calls proposer strategy and stores resulting proposal", () => {
    const session = createSession(simpleMachine);
    registerSpecialist({
      specialistId: "sp-1",
      sessionTypeName: "simple-task",
      role: "proposer",
      strategy: (_state: string, transitions: Record<string, string>) => {
        const name = Object.keys(transitions)[0];
        return {
          transitionName: name,
          toState: transitions[name],
          reasoning: "first available",
        };
      },
    });
    const proposal = solicitProposal(session.sessionId, "sp-1");
    expect(proposal.transitionName).toBe("complete");
    expect(proposal.toState).toBe("done");
    expect(store.proposals.get(proposal.proposalId)).toBe(proposal);
  });
});

describe("submitVote", () => {
  beforeEach(() => store.clear());

  it("creates with UUID and stores", () => {
    const vote = submitVote("s1", "sp-1", "pA", "pB", "A", "prefer A");
    expect(vote.voteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(vote.voteFor).toBe("A");
    expect(store.votes.get(vote.voteId)).toBe(vote);
  });
});

describe("solicitVote", () => {
  beforeEach(() => store.clear());

  it("calls voter strategy and stores resulting vote", () => {
    const session = createSession(simpleMachine);
    const pA = submitProposal(session.sessionId, "sp-1", "complete", "done");
    const pB = submitProposal(session.sessionId, "sp-2", "complete", "done");

    registerSpecialist({
      specialistId: "voter-1",
      sessionTypeName: "simple-task",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "A is better" }),
    });

    const vote = solicitVote(
      session.sessionId,
      "voter-1",
      pA.proposalId,
      pB.proposalId
    );
    expect(vote.voteFor).toBe("A");
    expect(store.votes.get(vote.voteId)).toBe(vote);
  });
});

describe("evaluateConsensus", () => {
  beforeEach(() => store.clear());

  it("single proposal → consensus reached", () => {
    const session = createSession(simpleMachine);
    const proposal = submitProposal(
      session.sessionId,
      "sp-1",
      "complete",
      "done"
    );
    const result = evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe(proposal.proposalId);
  });

  it("zero proposals → no consensus", () => {
    const session = createSession(simpleMachine);
    const result = evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(false);
  });

  it("two proposals, votes decide winner", () => {
    const session = createSession(simpleMachine);
    const pA = submitProposal(session.sessionId, "sp-1", "complete", "done");
    const pB = submitProposal(
      session.sessionId,
      "sp-2",
      "complete",
      "done",
      "alternate"
    );

    registerSpecialist({
      specialistId: "voter-1",
      sessionTypeName: "simple-task",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "A" }),
    });

    submitVote(
      session.sessionId,
      "voter-1",
      pA.proposalId,
      pB.proposalId,
      "A"
    );

    const result = evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe(pA.proposalId);
  });

  it("human voter overrides AI majority", () => {
    const session = createSession(simpleMachine);
    const pA = submitProposal(session.sessionId, "sp-1", "complete", "done");
    const pB = submitProposal(
      session.sessionId,
      "sp-2",
      "complete",
      "done",
      "other"
    );

    registerSpecialist({
      specialistId: "ai-voter-1",
      sessionTypeName: "simple-task",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "A" }),
    });
    registerSpecialist({
      specialistId: "ai-voter-2",
      sessionTypeName: "simple-task",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "A" }),
    });
    registerSpecialist({
      specialistId: "human-reviewer",
      sessionTypeName: "simple-task",
      role: "voter",
      strategy: () => ({ voteFor: "B" as const, reasoning: "B" }),
    });

    // Two AI votes for A
    submitVote(
      session.sessionId,
      "ai-voter-1",
      pA.proposalId,
      pB.proposalId,
      "A"
    );
    submitVote(
      session.sessionId,
      "ai-voter-2",
      pA.proposalId,
      pB.proposalId,
      "A"
    );
    // Human votes for B
    submitVote(
      session.sessionId,
      "human-reviewer",
      pA.proposalId,
      pB.proposalId,
      "B"
    );

    const result = evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe(pB.proposalId);
    expect(result.reasoning).toContain("Human");
  });
});

describe("executeTransition", () => {
  beforeEach(() => store.clear());

  it("updates session state", () => {
    const session = createSession(simpleMachine);
    const updated = executeTransition(
      session.sessionId,
      "complete",
      "done"
    );
    expect(updated.currentState).toBe("done");
  });

  it("throws on invalid transition", () => {
    const session = createSession(simpleMachine);
    expect(() =>
      executeTransition(session.sessionId, "invalid", "nowhere")
    ).toThrow("Invalid transition");
  });

  it("clears proposals/votes for the session after execution", () => {
    const session = createSession(simpleMachine);
    submitProposal(session.sessionId, "sp-1", "complete", "done");
    submitVote(session.sessionId, "v-1", "pA", "pB", "A");
    executeTransition(session.sessionId, "complete", "done");

    const remainingProposals = [...store.proposals.values()].filter(
      (p) => p.sessionId === session.sessionId
    );
    const remainingVotes = [...store.votes.values()].filter(
      (v) => v.sessionId === session.sessionId
    );
    expect(remainingProposals).toHaveLength(0);
    expect(remainingVotes).toHaveLength(0);
  });

  it("records transition with reasoning in session history", () => {
    const session = createSession(simpleMachine);
    executeTransition(session.sessionId, "complete", "done", "Consensus reached");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].fromState).toBe("pending");
    expect(session.history[0].toState).toBe("done");
    expect(session.history[0].transitionName).toBe("complete");
    expect(session.history[0].reasoning).toBe("Consensus reached");
    expect(session.history[0].timestamp).toBeInstanceOf(Date);
  });

  it("defaults reasoning to empty string when not provided", () => {
    const session = createSession(simpleMachine);
    executeTransition(session.sessionId, "complete", "done");
    expect(session.history[0].reasoning).toBe("");
  });
});
