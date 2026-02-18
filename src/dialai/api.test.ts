/**
 * API Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clear } from "./store.js";
import {
  createSession,
  getSession,
  getSessions,
  registerProposer,
  registerVoter,
  registerArbiter,
  submitProposal,
  submitVote,
  evaluateConsensus,
  submitArbitration,
  executeTransition,
  getProposers,
  getVoters,
  getArbiter,
} from "./api.js";
import type { MachineDefinition } from "./types.js";

const simpleMachine: MachineDefinition = {
  machineName: "test-machine",
  initialState: "pending",
  goalState: "done",
  states: {
    pending: {
      prompt: "Complete the task?",
      transitions: {
        complete: "done",
      },
    },
    done: {},
  },
};

const multiStateMachine: MachineDefinition = {
  machineName: "multi-state",
  initialState: "a",
  goalState: "c",
  states: {
    a: {
      prompt: "Go to B or C?",
      transitions: {
        to_b: "b",
        to_c: "c",
      },
    },
    b: {
      prompt: "Go to C?",
      transitions: {
        to_c: "c",
      },
    },
    c: {},
  },
};

describe("Session Management", () => {
  beforeEach(() => {
    clear();
  });

  it("creates a session with correct initial state", async () => {
    const session = await createSession(simpleMachine);

    expect(session.sessionId).toBeDefined();
    expect(session.machineName).toBe("test-machine");
    expect(session.currentState).toBe("pending");
    expect(session.currentRoundId).toBeDefined();
    expect(session.history).toEqual([]);
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.machine).toEqual(simpleMachine);
  });

  it("retrieves a session by ID", async () => {
    const created = await createSession(simpleMachine);
    const retrieved = await getSession(created.sessionId);

    expect(retrieved).toEqual(created);
  });

  it("throws when session not found", async () => {
    await expect(getSession("nonexistent")).rejects.toThrow("Session not found");
  });

  it("lists all sessions", async () => {
    const session1 = await createSession(simpleMachine);
    const session2 = await createSession(multiStateMachine);

    const sessions = await getSessions();

    expect(sessions).toHaveLength(2);
    expect(sessions).toContainEqual(session1);
    expect(sessions).toContainEqual(session2);
  });
});

describe("Specialist Registration", () => {
  beforeEach(() => {
    clear();
  });

  describe("registerProposer", () => {
    it("registers a proposer with strategyFnName", async () => {
      const proposer = await registerProposer({
        specialistId: "test-proposer",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      expect(proposer.role).toBe("proposer");
      expect(proposer.specialistId).toBe("test-proposer");
      expect(proposer.machineName).toBe("test-machine");
      expect(proposer.strategyFnName).toBe("firstAvailable");
    });

    it("registers a proposer with strategyFn", async () => {
      const strategyFn = async () => ({
        transitionName: "test",
        toState: "done",
        reasoning: "Test",
      });

      const proposer = await registerProposer({
        specialistId: "test-proposer",
        machineName: "test-machine",
        strategyFn,
      });

      expect(proposer.strategyFn).toBe(strategyFn);
    });

    it("throws on duplicate registration", async () => {
      await registerProposer({
        specialistId: "test-proposer",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      await expect(
        registerProposer({
          specialistId: "test-proposer",
          machineName: "test-machine",
          strategyFnName: "random",
        })
      ).rejects.toThrow("Specialist already exists");
    });

    it("throws on invalid strategy name", async () => {
      await expect(
        registerProposer({
          specialistId: "test-proposer",
          machineName: "test-machine",
          strategyFnName: "invalid",
        })
      ).rejects.toThrow("Unknown proposer strategy");
    });

    it("throws when no execution mode specified", async () => {
      await expect(
        registerProposer({
          specialistId: "test-proposer",
          machineName: "test-machine",
        })
      ).rejects.toThrow("No execution mode specified");
    });
  });

  describe("registerVoter", () => {
    it("registers a voter with strategyFnName", async () => {
      const voter = await registerVoter({
        specialistId: "test-voter",
        machineName: "test-machine",
        strategyFnName: "preferA",
      });

      expect(voter.role).toBe("voter");
      expect(voter.specialistId).toBe("test-voter");
      expect(voter.strategyFnName).toBe("preferA");
    });

    it("registers a voter with isHuman flag", async () => {
      const voter = await registerVoter({
        specialistId: "human-voter",
        machineName: "test-machine",
        strategyFnName: "preferA",
        isHuman: true,
      });

      expect(voter.isHuman).toBe(true);
    });
  });

  describe("registerArbiter", () => {
    it("registers an arbiter with strategyFnName", async () => {
      const arbiter = await registerArbiter({
        specialistId: "test-arbiter",
        machineName: "test-machine",
        strategyFnName: "aheadByK",
        threshold: 2,
      });

      expect(arbiter.role).toBe("arbiter");
      expect(arbiter.specialistId).toBe("test-arbiter");
      expect(arbiter.strategyFnName).toBe("aheadByK");
      expect(arbiter.threshold).toBe(2);
    });

    it("throws on invalid arbiter strategy", async () => {
      await expect(
        registerArbiter({
          specialistId: "test-arbiter",
          machineName: "test-machine",
          strategyFnName: "invalid",
        })
      ).rejects.toThrow("Unknown arbiter strategy");
    });
  });

  describe("getters", () => {
    it("getProposers returns proposers for a machine", async () => {
      await registerProposer({
        specialistId: "p1",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });
      await registerProposer({
        specialistId: "p2",
        machineName: "test-machine",
        strategyFnName: "random",
      });
      await registerProposer({
        specialistId: "p3",
        machineName: "other-machine",
        strategyFnName: "random",
      });

      const proposers = getProposers("test-machine");

      expect(proposers).toHaveLength(2);
      expect(proposers.map((p) => p.specialistId)).toContain("p1");
      expect(proposers.map((p) => p.specialistId)).toContain("p2");
    });

    it("getVoters returns voters for a machine", async () => {
      await registerVoter({
        specialistId: "v1",
        machineName: "test-machine",
        strategyFnName: "preferA",
      });

      const voters = getVoters("test-machine");

      expect(voters).toHaveLength(1);
      expect(voters[0].specialistId).toBe("v1");
    });

    it("getArbiter returns arbiter for a machine", async () => {
      await registerArbiter({
        specialistId: "arb",
        machineName: "test-machine",
        strategyFnName: "firstProposal",
      });

      const arbiter = getArbiter("test-machine");

      expect(arbiter).toBeDefined();
      expect(arbiter!.specialistId).toBe("arb");
    });
  });
});

describe("Decision Cycle", () => {
  beforeEach(() => {
    clear();
  });

  describe("submitProposal", () => {
    it("creates a proposal using strategy when transitionName omitted", async () => {
      const session = await createSession(simpleMachine);
      await registerProposer({
        specialistId: "proposer",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      const proposal = await submitProposal({
        sessionId: session.sessionId,
        specialistId: "proposer",
        roundId: session.currentRoundId,
      });

      expect(proposal.proposalId).toBeDefined();
      expect(proposal.sessionId).toBe(session.sessionId);
      expect(proposal.roundId).toBe(session.currentRoundId);
      expect(proposal.transitionName).toBe("complete");
      expect(proposal.toState).toBe("done");
      expect(proposal.isHuman).toBe(false);
    });

    it("creates a proposal with explicit transitionName", async () => {
      const session = await createSession(simpleMachine);
      await registerProposer({
        specialistId: "proposer",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      const proposal = await submitProposal({
        sessionId: session.sessionId,
        specialistId: "proposer",
        roundId: session.currentRoundId,
        transitionName: "complete",
        reasoning: "Manual reason",
      });

      expect(proposal.transitionName).toBe("complete");
      expect(proposal.reasoning).toBe("Manual reason");
    });

    it("throws for invalid transition", async () => {
      const session = await createSession(simpleMachine);
      await registerProposer({
        specialistId: "proposer",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      await expect(
        submitProposal({
          sessionId: session.sessionId,
          specialistId: "proposer",
          roundId: session.currentRoundId,
          transitionName: "invalid",
        })
      ).rejects.toThrow("Invalid transition");
    });
  });

  describe("submitVote", () => {
    it("creates a vote using strategy when voteFor omitted", async () => {
      const session = await createSession(multiStateMachine);
      await registerProposer({
        specialistId: "p1",
        machineName: "multi-state",
        strategyFnName: "firstAvailable",
      });
      await registerProposer({
        specialistId: "p2",
        machineName: "multi-state",
        strategyFnName: "lastAvailable",
      });
      await registerVoter({
        specialistId: "voter",
        machineName: "multi-state",
        strategyFnName: "preferA",
      });

      const propA = await submitProposal({
        sessionId: session.sessionId,
        specialistId: "p1",
      });
      const propB = await submitProposal({
        sessionId: session.sessionId,
        specialistId: "p2",
      });

      const vote = await submitVote({
        sessionId: session.sessionId,
        specialistId: "voter",
        roundId: session.currentRoundId,
        proposalIdA: propA.proposalId,
        proposalIdB: propB.proposalId,
      });

      expect(vote.voteId).toBeDefined();
      expect(vote.sessionId).toBe(session.sessionId);
      expect(vote.voteFor).toBe("A");
      expect(vote.proposalIdA).toBe(propA.proposalId);
      expect(vote.proposalIdB).toBe(propB.proposalId);
    });

    it("creates a vote with explicit voteFor", async () => {
      const session = await createSession(multiStateMachine);
      await registerProposer({
        specialistId: "p1",
        machineName: "multi-state",
        strategyFnName: "firstAvailable",
      });
      await registerProposer({
        specialistId: "p2",
        machineName: "multi-state",
        strategyFnName: "lastAvailable",
      });
      await registerVoter({
        specialistId: "voter",
        machineName: "multi-state",
        strategyFnName: "preferA",
      });

      const propA = await submitProposal({
        sessionId: session.sessionId,
        specialistId: "p1",
      });
      const propB = await submitProposal({
        sessionId: session.sessionId,
        specialistId: "p2",
      });

      const vote = await submitVote({
        sessionId: session.sessionId,
        specialistId: "voter",
        roundId: session.currentRoundId,
        proposalIdA: propA.proposalId,
        proposalIdB: propB.proposalId,
        voteFor: "B",
        reasoning: "Explicit B vote",
      });

      expect(vote.voteFor).toBe("B");
      expect(vote.reasoning).toBe("Explicit B vote");
    });
  });

  describe("evaluateConsensus", () => {
    it("returns consensus with single proposal and firstProposal arbiter", async () => {
      const session = await createSession(simpleMachine);
      await registerProposer({
        specialistId: "proposer",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });
      await registerArbiter({
        specialistId: "arbiter",
        machineName: "test-machine",
        strategyFnName: "firstProposal",
      });

      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "proposer",
      });

      const result = await evaluateConsensus(session.sessionId);

      expect(result.consensusReached).toBe(true);
      expect(result.winningProposalId).toBeDefined();
    });

    it("returns no consensus when threshold not met", async () => {
      const session = await createSession(multiStateMachine);
      await registerProposer({
        specialistId: "p1",
        machineName: "multi-state",
        strategyFnName: "firstAvailable",
      });
      await registerProposer({
        specialistId: "p2",
        machineName: "multi-state",
        strategyFnName: "lastAvailable",
      });
      await registerArbiter({
        specialistId: "arbiter",
        machineName: "multi-state",
        strategyFnName: "aheadByK",
        threshold: 3,
      });

      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "p1",
      });
      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "p2",
      });

      const result = await evaluateConsensus(session.sessionId);

      expect(result.consensusReached).toBe(false);
    });
  });

  describe("submitArbitration", () => {
    it("executes transition when consensus reached", async () => {
      const session = await createSession(simpleMachine);
      await registerProposer({
        specialistId: "proposer",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });
      await registerArbiter({
        specialistId: "arbiter",
        machineName: "test-machine",
        strategyFnName: "firstProposal",
      });

      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "proposer",
      });

      const result = await submitArbitration({
        sessionId: session.sessionId,
        roundId: session.currentRoundId,
      });

      expect(result.executed).toBe(true);
      expect(result.transitionName).toBe("complete");
      expect(result.toState).toBe("done");
      expect(result.guardsPass).toBe(true);
    });

    it("allows human override", async () => {
      const session = await createSession(multiStateMachine);
      await registerProposer({
        specialistId: "human",
        machineName: "multi-state",
        strategyFnName: "firstAvailable",
        isHuman: true,
      });
      await registerArbiter({
        specialistId: "arbiter",
        machineName: "multi-state",
        strategyFnName: "aheadByK",
        threshold: 100, // Very high threshold
      });

      const result = await submitArbitration({
        sessionId: session.sessionId,
        roundId: session.currentRoundId,
        specialistId: "human",
        transitionName: "to_c",
        reasoning: "Human override",
      });

      expect(result.executed).toBe(true);
      expect(result.isHuman).toBe(true);
      expect(result.transitionName).toBe("to_c");
    });

    it("rejects non-human override", async () => {
      const session = await createSession(multiStateMachine);
      await registerProposer({
        specialistId: "ai",
        machineName: "multi-state",
        strategyFnName: "firstAvailable",
      });
      await registerArbiter({
        specialistId: "arbiter",
        machineName: "multi-state",
        strategyFnName: "aheadByK",
      });

      const result = await submitArbitration({
        sessionId: session.sessionId,
        roundId: session.currentRoundId,
        specialistId: "ai",
        transitionName: "to_c",
      });

      expect(result.executed).toBe(false);
      expect(result.guardReason).toContain("human");
    });

    it("detects staleness", async () => {
      const session = await createSession(simpleMachine);
      await registerProposer({
        specialistId: "proposer",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });
      await registerArbiter({
        specialistId: "arbiter",
        machineName: "test-machine",
        strategyFnName: "firstProposal",
      });

      const oldRoundId = session.currentRoundId;
      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "proposer",
      });
      await submitArbitration({
        sessionId: session.sessionId,
        roundId: oldRoundId,
      });

      // Try again with old round ID
      const result = await submitArbitration({
        sessionId: session.sessionId,
        roundId: oldRoundId,
      });

      expect(result.stale).toBe(true);
      expect(result.executed).toBe(false);
    });
  });

  describe("executeTransition", () => {
    it("updates session state and history", async () => {
      const session = await createSession(simpleMachine);
      const originalRoundId = session.currentRoundId;

      const updated = await executeTransition(
        session.sessionId,
        "complete",
        "done",
        "Test transition"
      );

      expect(updated.currentState).toBe("done");
      expect(updated.history).toHaveLength(1);
      expect(updated.history[0].transitionName).toBe("complete");
      expect(updated.history[0].reasoning).toBe("Test transition");
      expect(updated.currentRoundId).not.toBe(originalRoundId);
    });

    it("throws for invalid transition", async () => {
      const session = await createSession(simpleMachine);

      await expect(
        executeTransition(session.sessionId, "invalid", "done")
      ).rejects.toThrow("Invalid transition");
    });

    it("throws for state mismatch", async () => {
      const session = await createSession(simpleMachine);

      await expect(
        executeTransition(session.sessionId, "complete", "wrong")
      ).rejects.toThrow("State mismatch");
    });
  });
});
