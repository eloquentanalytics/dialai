/**
 * Evaluation System Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clear } from "./store.js";
import { registerProposer } from "./api.js";
import { createExemplar } from "./exemplars.js";
import { evaluateAlignment, evaluateAccuracy } from "./evaluation.js";
import type { ProposerContext } from "./types.js";

const mockContext: ProposerContext = {
  sessionId: "s1",
  currentState: "a",
  prompt: "Choose",
  transitions: { to_b: "b", to_c: "c" },
  history: [],
};

describe("Evaluation System", () => {
  beforeEach(async () => {
    await clear();
  });

  describe("evaluateAlignment", () => {
    it("calculates alignment from exemplars", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      // Create exemplars where ai-1 matched 2 out of 3 times
      await createExemplar("test-machine", "a", mockContext, "to_b", "b", [
        {
          proposalId: "p1",
          sessionId: "s1",
          roundId: "r1",
          specialistId: "ai-1",
          isHuman: false,
          transitionName: "to_b", // matches
          toState: "b",
          reasoning: "Go B",
          createdAt: new Date(),
        },
      ]);

      await createExemplar("test-machine", "a", mockContext, "to_c", "c", [
        {
          proposalId: "p2",
          sessionId: "s1",
          roundId: "r2",
          specialistId: "ai-1",
          isHuman: false,
          transitionName: "to_b", // does NOT match
          toState: "b",
          reasoning: "Go B",
          createdAt: new Date(),
        },
      ]);

      await createExemplar("test-machine", "a", mockContext, "to_b", "b", [
        {
          proposalId: "p3",
          sessionId: "s1",
          roundId: "r3",
          specialistId: "ai-1",
          isHuman: false,
          transitionName: "to_b", // matches
          toState: "b",
          reasoning: "Go B",
          createdAt: new Date(),
        },
      ]);

      const result = await evaluateAlignment("ai-1", "test-machine");

      expect(result.specialistId).toBe("ai-1");
      expect(result.machineName).toBe("test-machine");
      expect(result.totalExemplars).toBe(3);
      expect(result.matchingDecisions).toBe(2);
      expect(result.alignmentScore).toBeCloseTo(0.2077, 3);
    });

    it("respects maxRounds option", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      await createExemplar("test-machine", "a", mockContext, "to_b", "b", [
        {
          proposalId: "p1",
          sessionId: "s1",
          roundId: "r1",
          specialistId: "ai-1",
          isHuman: false,
          transitionName: "to_b",
          toState: "b",
          reasoning: "Go B",
          createdAt: new Date(),
        },
      ]);

      await createExemplar("test-machine", "a", mockContext, "to_c", "c", [
        {
          proposalId: "p2",
          sessionId: "s1",
          roundId: "r2",
          specialistId: "ai-1",
          isHuman: false,
          transitionName: "to_b",
          toState: "b",
          reasoning: "Go B",
          createdAt: new Date(),
        },
      ]);

      const result = await evaluateAlignment("ai-1", "test-machine", { maxRounds: 1 });

      expect(result.totalExemplars).toBe(1);
      expect(result.matchingDecisions).toBe(1);
    });

    it("returns 0 alignment when no exemplars exist", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      const result = await evaluateAlignment("ai-1", "test-machine");

      expect(result.totalExemplars).toBe(0);
      expect(result.alignmentScore).toBe(0);
    });

    it("throws for unknown specialist", async () => {
      await expect(
        evaluateAlignment("unknown", "test-machine")
      ).rejects.toThrow("Specialist not found");
    });
  });

  describe("evaluateAccuracy", () => {
    it("calculates accuracy metrics from exemplars", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      await createExemplar("test-machine", "a", mockContext, "to_b", "b", [
        {
          proposalId: "p1",
          sessionId: "s1",
          roundId: "r1",
          specialistId: "ai-1",
          isHuman: false,
          transitionName: "to_b",
          toState: "b",
          reasoning: "Go B",
          costUSD: 0.01,
          latencyMsec: 100,
          createdAt: new Date(),
        },
      ]);

      await createExemplar("test-machine", "a", mockContext, "to_c", "c", [
        {
          proposalId: "p2",
          sessionId: "s1",
          roundId: "r2",
          specialistId: "ai-1",
          isHuman: false,
          transitionName: "to_b",
          toState: "b",
          reasoning: "Go B",
          costUSD: 0.02,
          latencyMsec: 200,
          createdAt: new Date(),
        },
      ]);

      const result = await evaluateAccuracy("ai-1", "test-machine");

      expect(result.specialistId).toBe("ai-1");
      expect(result.totalDecisions).toBe(2);
      expect(result.transitionMatchRate).toBe(0.5); // 1 of 2 matched
      expect(result.stateMatchRate).toBe(0.5); // 1 of 2 matched
      expect(result.totalCostUSD).toBe(0.03);
      expect(result.avgLatencyMsec).toBe(150);
    });

    it("respects lookback option", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "test-machine",
        strategyFnName: "firstAvailable",
      });

      // Create 3 exemplars
      for (let i = 0; i < 3; i++) {
        await createExemplar("test-machine", "a", mockContext, "to_b", "b", [
          {
            proposalId: `p${i}`,
            sessionId: "s1",
            roundId: `r${i}`,
            specialistId: "ai-1",
            isHuman: false,
            transitionName: "to_b",
            toState: "b",
            reasoning: "Go B",
            createdAt: new Date(),
          },
        ]);
      }

      const result = await evaluateAccuracy("ai-1", "test-machine", { lookback: 2 });

      expect(result.totalDecisions).toBe(2);
    });

    it("throws for unknown specialist", async () => {
      await expect(
        evaluateAccuracy("unknown", "test-machine")
      ).rejects.toThrow("Specialist not found");
    });
  });
});
