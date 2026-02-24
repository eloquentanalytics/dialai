/**
 * Strategies Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  firstAvailable,
  lastAvailable,
  randomProposer,
  firstProposal,
  alignmentMargin,
} from "./strategies.js";
import type {
  ProposerContext,
  ArbiterContext,
  Proposal,
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
        machineName: "test",
        proposals: [prop2, prop1], // Intentionally out of order
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
        machineName: "test",
        proposals: [],
        history: [],
        threshold: 1,
      };

      const result = await firstProposal(ctx);

      expect(result.consensusReached).toBe(false);
    });
  });

  describe("alignmentMargin", () => {
    it("returns consensus for single proposal with threshold < 1", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        machineName: "test",
        proposals: [propA],
        history: [],
        threshold: 0.9,
      };

      const result = await alignmentMargin(ctx);

      expect(result.consensusReached).toBe(true);
      expect(result.winningProposalId).toBe("prop-a");
    });

    it("returns consensus for single proposal with threshold = 1 (unanimity)", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        machineName: "test",
        proposals: [propA],
        history: [],
        threshold: 1,
      };

      const result = await alignmentMargin(ctx);

      // Single proposal is auto-approved at threshold=1 (threshold <= 1)
      expect(result.consensusReached).toBe(true);
      expect(result.winningProposalId).toBe("prop-a");
    });

    it("returns no consensus for single proposal with threshold > 1 and no alignment", async () => {
      const propA = makeProposal({ proposalId: "prop-a" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        machineName: "test",
        proposals: [propA],
        history: [],
        threshold: 2,
      };

      const result = await alignmentMargin(ctx);

      expect(result.consensusReached).toBe(false);
      expect(result.reasoning).toContain("Cold start");
    });

    it("returns consensus when alignment-weighted margin meets threshold", async () => {
      const propA = makeProposal({ proposalId: "prop-a", specialistId: "s1", transitionName: "approve" });
      const propB = makeProposal({ proposalId: "prop-b", specialistId: "s2", transitionName: "reject", toState: "rejected" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        machineName: "test",
        proposals: [propA, propB],
        alignmentScores: { s1: 0.9, s2: 0.1 },
        history: [],
        threshold: 0.5,
      };

      const result = await alignmentMargin(ctx);

      expect(result.consensusReached).toBe(true);
      expect(result.winningProposalId).toBe("prop-a");
    });

    it("returns no consensus when alignment-weighted margin below threshold", async () => {
      const propA = makeProposal({ proposalId: "prop-a", specialistId: "s1", transitionName: "approve" });
      const propB = makeProposal({ proposalId: "prop-b", specialistId: "s2", transitionName: "reject", toState: "rejected" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        machineName: "test",
        proposals: [propA, propB],
        alignmentScores: { s1: 0.5, s2: 0.5 },
        history: [],
        threshold: 0.5,
      };

      const result = await alignmentMargin(ctx);

      expect(result.consensusReached).toBe(false);
    });

    it("returns no consensus on cold start (all alignment = 0)", async () => {
      const propA = makeProposal({ proposalId: "prop-a", specialistId: "s1" });
      const propB = makeProposal({ proposalId: "prop-b", specialistId: "s2", transitionName: "reject", toState: "rejected" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        machineName: "test",
        proposals: [propA, propB],
        alignmentScores: {},
        history: [],
        threshold: 0.5,
      };

      const result = await alignmentMargin(ctx);

      expect(result.consensusReached).toBe(false);
      expect(result.reasoning).toContain("Cold start");
    });

    it("returns no proposals result", async () => {
      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        machineName: "test",
        proposals: [],
        history: [],
        threshold: 1,
      };

      const result = await alignmentMargin(ctx);

      expect(result.consensusReached).toBe(false);
      expect(result.reasoning).toBe("No proposals");
    });

    it("picks best proposal from winning transition group", async () => {
      const propA1 = makeProposal({ proposalId: "prop-a1", specialistId: "s1", transitionName: "approve" });
      const propA2 = makeProposal({ proposalId: "prop-a2", specialistId: "s2", transitionName: "approve" });
      const propB = makeProposal({ proposalId: "prop-b", specialistId: "s3", transitionName: "reject", toState: "rejected" });

      const ctx: ArbiterContext = {
        sessionId: "session-1",
        roundId: "round-1",
        currentState: "pending",
        prompt: "Evaluate",
        machineName: "test",
        proposals: [propA1, propA2, propB],
        alignmentScores: { s1: 0.3, s2: 0.8, s3: 0.1 },
        history: [],
        threshold: 0.5,
      };

      const result = await alignmentMargin(ctx);

      expect(result.consensusReached).toBe(true);
      // s2 has highest alignment in the winning "approve" group
      expect(result.winningProposalId).toBe("prop-a2");
    });
  });
});
