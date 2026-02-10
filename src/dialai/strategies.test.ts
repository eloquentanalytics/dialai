/**
 * Strategies Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  firstAvailable,
  lastAvailable,
  randomProposer,
  preferA,
  preferB,
  both,
  neither,
  preferGoal,
  preferShorterPath,
  firstProposal,
  aheadByK,
  pairwiseConsensus,
} from "./strategies.js";
import type {
  ProposerContext,
  VoterContext,
  ArbiterContext,
  Proposal,
  Vote,
} from "./types.js";

const baseProposerContext: ProposerContext = {
  sessionId: "session-1",
  currentState: "pending",
  prompt: "What should we do?",
  transitions: {
    approve: "approved",
    reject: "rejected",
  },
  history: [],
};

const makeProposal = (
  overrides: Partial<Proposal> = {}
): Proposal => ({
  proposalId: `proposal-${Math.random().toString(36).slice(2)}`,
  sessionId: "session-1",
  roundId: "round-1",
  specialistId: "proposer-1",
  isHuman: false,
  transitionName: "approve",
  toState: "approved",
  reasoning: "Default reasoning",
  createdAt: new Date(),
  ...overrides,
});

const makeVote = (
  proposalIdA: string,
  proposalIdB: string,
  voteFor: "A" | "B" | "BOTH" | "NEITHER"
): Vote => ({
  voteId: `vote-${Math.random().toString(36).slice(2)}`,
  sessionId: "session-1",
  roundId: "round-1",
  specialistId: "voter-1",
  isHuman: false,
  proposalIdA,
  proposalIdB,
  voteFor,
  reasoning: "Vote reasoning",
});

describe("Proposer Strategies", () => {
  describe("firstAvailable", () => {
    it("returns the first transition", async () => {
      const result = await firstAvailable(baseProposerContext);

      expect(result.transitionName).toBe("approve");
      expect(result.toState).toBe("approved");
    });

    it("throws when no transitions available", async () => {
      const ctx = { ...baseProposerContext, transitions: {} };

      await expect(firstAvailable(ctx)).rejects.toThrow(
        "No transitions available"
      );
    });
  });

  describe("lastAvailable", () => {
    it("returns the last transition", async () => {
      const result = await lastAvailable(baseProposerContext);

      expect(result.transitionName).toBe("reject");
      expect(result.toState).toBe("rejected");
    });
  });

  describe("randomProposer", () => {
    it("returns a valid transition", async () => {
      const result = await randomProposer(baseProposerContext);

      expect(["approve", "reject"]).toContain(result.transitionName);
      expect(["approved", "rejected"]).toContain(result.toState);
    });
  });
});

describe("Voter Strategies", () => {
  const propA = makeProposal({ proposalId: "prop-a", transitionName: "approve" });
  const propB = makeProposal({
    proposalId: "prop-b",
    transitionName: "reject",
    toState: "rejected",
  });

  const baseVoterContext: VoterContext = {
    sessionId: "session-1",
    currentState: "pending",
    prompt: "Compare proposals",
    proposalA: propA,
    proposalB: propB,
    history: [],
  };

  describe("preferA", () => {
    it("always votes A", async () => {
      const result = await preferA(baseVoterContext);
      expect(result.voteFor).toBe("A");
    });
  });

  describe("preferB", () => {
    it("always votes B", async () => {
      const result = await preferB(baseVoterContext);
      expect(result.voteFor).toBe("B");
    });
  });

  describe("both", () => {
    it("always votes BOTH", async () => {
      const result = await both(baseVoterContext);
      expect(result.voteFor).toBe("BOTH");
    });
  });

  describe("neither", () => {
    it("always votes NEITHER", async () => {
      const result = await neither(baseVoterContext);
      expect(result.voteFor).toBe("NEITHER");
    });
  });

  describe("preferGoal", () => {
    it("returns A or B based on state length heuristic", async () => {
      const result = await preferGoal(baseVoterContext);
      expect(["A", "B"]).toContain(result.voteFor);
    });
  });

  describe("preferShorterPath", () => {
    it("prefers shorter transition name", async () => {
      const result = await preferShorterPath(baseVoterContext);
      // "approve" (7) vs "reject" (6) - reject is shorter
      expect(result.voteFor).toBe("B");
    });
  });
});

describe("Arbiter Strategies", () => {
  describe("firstProposal", () => {
    it("returns consensus on first proposal", async () => {
      const prop1 = makeProposal({
        proposalId: "first",
        createdAt: new Date("2024-01-01"),
      });
      const prop2 = makeProposal({
        proposalId: "second",
        createdAt: new Date("2024-01-02"),
      });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [prop2, prop1], // Intentionally out of order
        votes: [],
        history: [],
        threshold: 1,
      };

      const result = await firstProposal(ctx);

      expect(result.consensusReached).toBe(true);
      expect(result.winningProposalId).toBe("first");
    });

    it("returns no consensus when no proposals", async () => {
      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [],
        votes: [],
        history: [],
        threshold: 1,
      };

      const result = await firstProposal(ctx);

      expect(result.consensusReached).toBe(false);
    });
  });

  describe("aheadByK", () => {
    it("returns consensus when leader ahead by threshold", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });
      const propB = makeProposal({ proposalId: "prop-b" });

      const votes: Vote[] = [
        makeVote("prop-a", "prop-b", "A"),
        makeVote("prop-a", "prop-b", "A"),
        makeVote("prop-a", "prop-b", "A"),
      ];

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [propA, propB],
        votes,
        history: [],
        threshold: 2,
      };

      const result = await aheadByK(ctx);

      expect(result.consensusReached).toBe(true);
      expect(result.winningProposalId).toBe("prop-a");
    });

    it("returns no consensus when not ahead by threshold", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });
      const propB = makeProposal({ proposalId: "prop-b" });

      const votes: Vote[] = [
        makeVote("prop-a", "prop-b", "A"),
        makeVote("prop-a", "prop-b", "B"),
      ];

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [propA, propB],
        votes,
        history: [],
        threshold: 2,
      };

      const result = await aheadByK(ctx);

      expect(result.consensusReached).toBe(false);
    });

    it("handles BOTH votes", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });
      const propB = makeProposal({ proposalId: "prop-b" });

      const votes: Vote[] = [
        makeVote("prop-a", "prop-b", "BOTH"),
        makeVote("prop-a", "prop-b", "BOTH"),
      ];

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [propA, propB],
        votes,
        history: [],
        threshold: 1,
      };

      const result = await aheadByK(ctx);

      // Both have 2 votes each, so lead is 0 < threshold 1
      expect(result.consensusReached).toBe(false);
    });

    it("handles single proposal with no votes", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [propA],
        votes: [],
        history: [],
        threshold: 1,
      };

      const result = await aheadByK(ctx);

      expect(result.consensusReached).toBe(true);
      expect(result.winningProposalId).toBe("prop-a");
    });
  });

  describe("pairwiseConsensus", () => {
    it("returns consensus when win rate exceeds threshold", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });
      const propB = makeProposal({ proposalId: "prop-b" });

      const votes: Vote[] = [
        makeVote("prop-a", "prop-b", "A"),
        makeVote("prop-a", "prop-b", "A"),
        makeVote("prop-a", "prop-b", "A"),
        makeVote("prop-a", "prop-b", "B"),
      ];

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [propA, propB],
        votes,
        history: [],
        threshold: 0.6,
      };

      const result = await pairwiseConsensus(ctx);

      expect(result.consensusReached).toBe(true);
      expect(result.winningProposalId).toBe("prop-a");
    });

    it("returns no consensus when win rate below threshold", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });
      const propB = makeProposal({ proposalId: "prop-b" });

      const votes: Vote[] = [
        makeVote("prop-a", "prop-b", "A"),
        makeVote("prop-a", "prop-b", "B"),
      ];

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [propA, propB],
        votes,
        history: [],
        threshold: 0.75,
      };

      const result = await pairwiseConsensus(ctx);

      expect(result.consensusReached).toBe(false);
    });

    it("returns consensus for single proposal", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        proposals: [propA],
        votes: [],
        history: [],
        threshold: 0.75,
      };

      const result = await pairwiseConsensus(ctx);

      expect(result.consensusReached).toBe(true);
    });
  });
});
