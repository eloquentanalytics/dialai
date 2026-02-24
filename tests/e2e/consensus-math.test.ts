/**
 * E2E Tests - Consensus Math Verification
 * DIAL_408–DIAL_415
 *
 * Tests the exact alignment-weighted margin calculations in the alignmentMargin strategy.
 *
 * The alignmentMargin formula:
 * 1. Group proposals by transitionName
 * 2. Score each group = sum of alignment scores of proposers
 * 3. margin = (leaderScore - runnerUpScore) / totalAlignment
 * 4. Consensus when margin >= threshold
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  evaluateConsensus,
  updateAlignment,
  getAlignmentScore,
} from "../../src/dialai/index.js";
import type {
  MachineDefinition,
  ProposerContext,
} from "../../src/dialai/types.js";

describe("E2E: Consensus Math Verification", () => {
  beforeEach(async () => {
    await clear();
  });

  const machine: MachineDefinition = {
    machineName: "math-test",
    initialState: "pending",
    goalState: "approved",
    states: {
      pending: {
        prompt: "Approve or reject?",
        transitions: {
          approve: "approved",
          reject: "rejected",
        },
      },
      approved: {},
      rejected: {},
    },
  };

  /**
   * Helper: seed alignment score for a specialist to a target value.
   * Uses multiple updateAlignment calls to achieve the desired score.
   * Score uses Wilson lower bound, so the actual alignment score will be lower
   * than the raw rate, especially for small sample sizes. Use large
   * totalComparisons (1000+) to get Wilson scores close to the raw rate.
   */
  async function seedAlignment(
    specialistId: string,
    machineName: string,
    score: number,
    totalComparisons: number = 10
  ): Promise<void> {
    const matches = Math.round(score * totalComparisons);
    for (let i = 0; i < matches; i++) {
      await updateAlignment(specialistId, machineName, true);
    }
    for (let i = 0; i < totalComparisons - matches; i++) {
      await updateAlignment(specialistId, machineName, false);
    }
  }

  it("DIAL_408: 2 proposers, threshold 0.5, both agree — consensus reached", async () => {
    // Both propose "approve" with alignment ~0.9 and ~0.6 (Wilson-adjusted)
    // All on same transition: margin = (sum - 0) / sum = 1.0 >= 0.5 -> consensus
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "p1",
      machineName: "math-test",
      strategyFn: async (_ctx: ProposerContext) => ({
        transitionName: "approve",
        toState: "approved",
        reasoning: "I agree",
      }),
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "math-test",
      strategyFn: async (_ctx: ProposerContext) => ({
        transitionName: "approve",
        toState: "approved",
        reasoning: "I also agree",
      }),
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "math-test",
      strategyFnName: "alignmentMargin",
      threshold: 0.5,
    });

    // Seed alignment with large sample size so Wilson scores are close to raw rates
    await seedAlignment("p1", "math-test", 0.9, 1000);
    await seedAlignment("p2", "math-test", 0.6, 1000);

    // Verify alignment scores are non-trivial (Wilson scores will be below raw rates)
    expect(await getAlignmentScore("p1", "math-test")).toBeGreaterThan(0.8);
    expect(await getAlignmentScore("p2", "math-test")).toBeGreaterThan(0.5);

    // Submit proposals
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p2",
      roundId: session.currentRoundId,
    });

    const result = await evaluateConsensus(session.sessionId);

    // Both propose "approve": all weight on one transition, runnerUp = 0
    // margin = (sum - 0) / sum = 1.0 >= 0.5
    expect(result.consensusReached).toBe(true);
    expect(result.reasoning).toContain("1.00");
    expect(result.reasoning).toContain("approve");
  });

  it("DIAL_410: 3 proposers, 2 agree, 1 disagrees — consensus reached", async () => {
    // Proposers A(~0.9) and B(~0.6) propose "approve"
    // Proposer C(~0.3) proposes "reject"
    // With 10000 samples, Wilson scores are very close to raw rates
    // margin = (approve - reject) / total ≈ 0.67 >= 0.5 -> consensus
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "pA",
      machineName: "math-test",
      strategyFn: async () => ({
        transitionName: "approve",
        toState: "approved",
        reasoning: "approve",
      }),
    });
    await registerProposer({
      specialistId: "pB",
      machineName: "math-test",
      strategyFn: async () => ({
        transitionName: "approve",
        toState: "approved",
        reasoning: "approve too",
      }),
    });
    await registerProposer({
      specialistId: "pC",
      machineName: "math-test",
      strategyFn: async () => ({
        transitionName: "reject",
        toState: "rejected",
        reasoning: "reject",
      }),
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "math-test",
      strategyFnName: "alignmentMargin",
      threshold: 0.5,
    });

    // Seed alignment with 10000 samples so Wilson ≈ raw rate
    await seedAlignment("pA", "math-test", 0.9, 10000);
    await seedAlignment("pB", "math-test", 0.6, 10000);
    await seedAlignment("pC", "math-test", 0.3, 10000);

    expect(await getAlignmentScore("pA", "math-test")).toBeGreaterThan(0.8);
    expect(await getAlignmentScore("pB", "math-test")).toBeGreaterThan(0.5);
    expect(await getAlignmentScore("pC", "math-test")).toBeGreaterThan(0.2);

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "pA",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "pB",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "pC",
      roundId: session.currentRoundId,
    });

    const result = await evaluateConsensus(session.sessionId);

    // With Wilson-adjusted scores at 10000 samples:
    // approve ≈ 0.894 + 0.590 = 1.484, reject ≈ 0.291, total ≈ 1.775
    // margin ≈ 1.193 / 1.775 ≈ 0.67
    expect(result.consensusReached).toBe(true);
    expect(result.reasoning).toContain("0.67");
    expect(result.reasoning).toContain("approve");
  });

  it("DIAL_414: boundary — margin near threshold — consensus reached", async () => {
    // With 2 proposers: one proposes "approve", one proposes "reject"
    // margin = (leaderScore - runnerUpScore) / totalAlignment
    //
    // Using alignment rates 0.75 and 0.25 with 1000 samples:
    // Wilson(750,1000) ≈ 0.722, Wilson(250,1000) ≈ 0.224
    // margin = (0.722 - 0.224) / (0.722 + 0.224) ≈ 0.53
    // threshold = 0.5 -> margin >= threshold -> consensus!
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "pX",
      machineName: "math-test",
      strategyFn: async () => ({
        transitionName: "approve",
        toState: "approved",
        reasoning: "approve",
      }),
    });
    await registerProposer({
      specialistId: "pY",
      machineName: "math-test",
      strategyFn: async () => ({
        transitionName: "reject",
        toState: "rejected",
        reasoning: "reject",
      }),
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "math-test",
      strategyFnName: "alignmentMargin",
      threshold: 0.5,
    });

    // Seed alignment with large sample size so Wilson scores are close to raw rates
    await seedAlignment("pX", "math-test", 0.75, 1000);
    await seedAlignment("pY", "math-test", 0.25, 1000);

    expect(await getAlignmentScore("pX", "math-test")).toBeGreaterThan(0.7);
    expect(await getAlignmentScore("pY", "math-test")).toBeGreaterThan(0.2);

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "pX",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "pY",
      roundId: session.currentRoundId,
    });

    const result = await evaluateConsensus(session.sessionId);

    // margin ≈ 0.53, which is above threshold 0.5 -> consensus
    expect(result.consensusReached).toBe(true);
    expect(result.reasoning).toContain("0.5");
  });

  it("DIAL_415: boundary — margin below threshold — no consensus", async () => {
    // pHigh alignment ~0.6, proposes "approve"
    // pLow alignment ~0.4, proposes "reject"
    // With 1000 samples:
    // Wilson(600,1000) ≈ 0.569, Wilson(400,1000) ≈ 0.370
    // margin = (0.569 - 0.370) / (0.569 + 0.370) ≈ 0.21
    // threshold = 0.3 -> margin 0.21 < 0.3 -> NO consensus
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "pHigh",
      machineName: "math-test",
      strategyFn: async () => ({
        transitionName: "approve",
        toState: "approved",
        reasoning: "approve",
      }),
    });
    await registerProposer({
      specialistId: "pLow",
      machineName: "math-test",
      strategyFn: async () => ({
        transitionName: "reject",
        toState: "rejected",
        reasoning: "reject",
      }),
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "math-test",
      strategyFnName: "alignmentMargin",
      threshold: 0.3,
    });

    // Seed alignment with large sample size so Wilson scores are close to raw rates
    await seedAlignment("pHigh", "math-test", 0.6, 1000);
    await seedAlignment("pLow", "math-test", 0.4, 1000);

    expect(await getAlignmentScore("pHigh", "math-test")).toBeGreaterThan(0.5);
    expect(await getAlignmentScore("pLow", "math-test")).toBeGreaterThan(0.3);

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "pHigh",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "pLow",
      roundId: session.currentRoundId,
    });

    const result = await evaluateConsensus(session.sessionId);

    // margin ≈ 0.21 < 0.3 threshold
    expect(result.consensusReached).toBe(false);
    expect(result.reasoning).toContain("0.21");
    expect(result.reasoning).toContain("below threshold");
  });
});
