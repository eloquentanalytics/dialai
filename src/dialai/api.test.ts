import { describe, it, expect, beforeEach } from "vitest";
import * as store from "./store.js";
import {
  createSession,
  getSession,
  getSessions,
  registerProposer,
  registerVoter,
  submitProposal,
  solicitProposal,
  submitVote,
  solicitVote,
  evaluateConsensus,
  executeTransition,
} from "./api.js";
import type { MachineDefinition } from "./types.js";

const simpleMachine: MachineDefinition = {
  machineName: "simple-task",
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

  it("creates with correct initial state and generates UUID", async () => {
    const session = await createSession(simpleMachine);
    expect(session.currentState).toBe("pending");
    expect(session.machineName).toBe("simple-task");
    expect(session.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(session.machine).toBe(simpleMachine);
    expect(session.createdAt).toBeInstanceOf(Date);
  });
});

describe("getSession", () => {
  beforeEach(() => store.clear());

  it("returns stored session", async () => {
    const session = await createSession(simpleMachine);
    const fetched = await getSession(session.sessionId);
    expect(fetched).toBe(session);
  });

  it("throws on unknown ID", async () => {
    await expect(getSession("nonexistent")).rejects.toThrow("Session not found");
  });
});

describe("getSessions", () => {
  beforeEach(() => store.clear());

  it("returns all sessions", async () => {
    await createSession(simpleMachine);
    await createSession(simpleMachine);
    expect(await getSessions()).toHaveLength(2);
  });

  it("returns [] when empty", async () => {
    expect(await getSessions()).toEqual([]);
  });
});

describe("registerProposer", () => {
  beforeEach(() => store.clear());

  it("stores with async strategyFn", async () => {
    const strategyFn = async () => ({
      transitionName: "complete",
      toState: "done",
      reasoning: "test",
    });
    const spec = await registerProposer({
      specialistId: "sp-1",
      machineName: "simple-task",
      strategyFn,
    });
    expect(spec.role).toBe("proposer");
    expect(spec.strategyFn).toBe(strategyFn);
    expect(store.specialists.get("sp-1")).toBe(spec);
  });
});

describe("registerVoter", () => {
  beforeEach(() => store.clear());

  it("stores with async strategyFn", async () => {
    const strategyFn = async () => ({
      voteFor: "A" as const,
      reasoning: "test",
    });
    const spec = await registerVoter({
      specialistId: "v-1",
      machineName: "simple-task",
      strategyFn,
    });
    expect(spec.role).toBe("voter");
    expect(spec.strategyFn).toBe(strategyFn);
    expect(store.specialists.get("v-1")).toBe(spec);
  });
});

describe("submitProposal", () => {
  beforeEach(() => store.clear());

  it("creates with UUID and stores", async () => {
    const session = await createSession(simpleMachine);
    const proposal = await submitProposal(
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

  it("calls proposer strategy and stores resulting proposal", async () => {
    const session = await createSession(simpleMachine);
    await registerProposer({
      specialistId: "sp-1",
      machineName: "simple-task",
      strategyFn: async (ctx) => {
        const name = Object.keys(ctx.transitions)[0];
        return {
          transitionName: name,
          toState: ctx.transitions[name],
          reasoning: "first available",
        };
      },
    });
    const proposal = await solicitProposal(session.sessionId, "sp-1");
    expect(proposal.transitionName).toBe("complete");
    expect(proposal.toState).toBe("done");
    expect(store.proposals.get(proposal.proposalId)).toBe(proposal);
  });
});

describe("submitVote", () => {
  beforeEach(() => store.clear());

  it("creates with UUID and stores", async () => {
    const vote = await submitVote("s1", "sp-1", "pA", "pB", "A", "prefer A");
    expect(vote.voteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(vote.voteFor).toBe("A");
    expect(store.votes.get(vote.voteId)).toBe(vote);
  });
});

describe("solicitVote", () => {
  beforeEach(() => store.clear());

  it("calls voter strategy and stores resulting vote", async () => {
    const session = await createSession(simpleMachine);
    const pA = await submitProposal(session.sessionId, "sp-1", "complete", "done");
    const pB = await submitProposal(session.sessionId, "sp-2", "complete", "done");

    await registerVoter({
      specialistId: "voter-1",
      machineName: "simple-task",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "A is better" }),
    });

    const vote = await solicitVote(
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

  it("single proposal -> consensus reached", async () => {
    const session = await createSession(simpleMachine);
    const proposal = await submitProposal(
      session.sessionId,
      "sp-1",
      "complete",
      "done"
    );
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe(proposal.proposalId);
  });

  it("zero proposals -> no consensus", async () => {
    const session = await createSession(simpleMachine);
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(false);
  });

  it("two proposals, votes decide winner", async () => {
    const session = await createSession(simpleMachine);
    const pA = await submitProposal(session.sessionId, "sp-1", "complete", "done");
    const pB = await submitProposal(
      session.sessionId,
      "sp-2",
      "complete",
      "done",
      "alternate"
    );

    await registerVoter({
      specialistId: "voter-1",
      machineName: "simple-task",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "A" }),
    });

    await submitVote(
      session.sessionId,
      "voter-1",
      pA.proposalId,
      pB.proposalId,
      "A"
    );

    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe(pA.proposalId);
  });

  it("human voter overrides AI majority", async () => {
    const session = await createSession(simpleMachine);
    const pA = await submitProposal(session.sessionId, "sp-1", "complete", "done");
    const pB = await submitProposal(
      session.sessionId,
      "sp-2",
      "complete",
      "done",
      "other"
    );

    await registerVoter({
      specialistId: "ai-voter-1",
      machineName: "simple-task",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "A" }),
    });
    await registerVoter({
      specialistId: "ai-voter-2",
      machineName: "simple-task",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "A" }),
    });
    await registerVoter({
      specialistId: "human-reviewer",
      machineName: "simple-task",
      strategyFn: async () => ({ voteFor: "B" as const, reasoning: "B" }),
    });

    // Two AI votes for A
    await submitVote(
      session.sessionId,
      "ai-voter-1",
      pA.proposalId,
      pB.proposalId,
      "A"
    );
    await submitVote(
      session.sessionId,
      "ai-voter-2",
      pA.proposalId,
      pB.proposalId,
      "A"
    );
    // Human votes for B
    await submitVote(
      session.sessionId,
      "human-reviewer",
      pA.proposalId,
      pB.proposalId,
      "B"
    );

    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe(pB.proposalId);
    expect(result.reasoning).toContain("human preferred");
  });
});

describe("executeTransition", () => {
  beforeEach(() => store.clear());

  it("updates session state", async () => {
    const session = await createSession(simpleMachine);
    const updated = await executeTransition(
      session.sessionId,
      "complete",
      "done"
    );
    expect(updated.currentState).toBe("done");
  });

  it("throws on invalid transition", async () => {
    const session = await createSession(simpleMachine);
    await expect(
      executeTransition(session.sessionId, "invalid", "nowhere")
    ).rejects.toThrow("Invalid transition");
  });

  it("clears proposals/votes for the session after execution", async () => {
    const session = await createSession(simpleMachine);
    await submitProposal(session.sessionId, "sp-1", "complete", "done");
    await submitVote(session.sessionId, "v-1", "pA", "pB", "A");
    await executeTransition(session.sessionId, "complete", "done");

    const remainingProposals = [...store.proposals.values()].filter(
      (p) => p.sessionId === session.sessionId
    );
    const remainingVotes = [...store.votes.values()].filter(
      (v) => v.sessionId === session.sessionId
    );
    expect(remainingProposals).toHaveLength(0);
    expect(remainingVotes).toHaveLength(0);
  });

  it("records transition with reasoning in session history", async () => {
    const session = await createSession(simpleMachine);
    await executeTransition(session.sessionId, "complete", "done", "Consensus reached");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].fromState).toBe("pending");
    expect(session.history[0].toState).toBe("done");
    expect(session.history[0].transitionName).toBe("complete");
    expect(session.history[0].reasoning).toBe("Consensus reached");
    expect(session.history[0].timestamp).toBeInstanceOf(Date);
  });

  it("defaults reasoning to empty string when not provided", async () => {
    const session = await createSession(simpleMachine);
    await executeTransition(session.sessionId, "complete", "done");
    expect(session.history[0].reasoning).toBe("");
  });
});
