/**
 * E2E Tests - Consensus Math Verification
 * DIAL_408–DIAL_415
 *
 * Tests the exact alignment-weighted margin calculations in the aheadByK strategy.
 *
 * The aheadByK formula:
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
  beforeEach(() => {
    clear();
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
   * Score = matchingChoices / totalComparisons
   * To get score of X with precision, we use appropriate match/total counts.
   */
  function seedAlignment(
    specialistId: string,
    machineName: string,
    score: number,
    totalComparisons: number = 10
  ): void {
    const matches = Math.round(score * totalComparisons);
    for (let i = 0; i < matches; i++) {
      updateAlignment(specialistId, machineName, true);
    }
    for (let i = 0; i < totalComparisons - matches; i++) {
      updateAlignment(specialistId, machineName, false);
    }
  }

  it("DIAL_408: 2 proposers, threshold 0.5, both agree — consensus reached", async () => {
    // Both propose "approve" with alignment 0.9 and 0.6
    // All on same transition: margin = (1.5 - 0) / 1.5 = 1.0 >= 0.5 -> consensus
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
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Seed alignment: p1 = 0.9, p2 = 0.6
    seedAlignment("p1", "math-test", 0.9);
    seedAlignment("p2", "math-test", 0.6);

    // Verify alignment scores
    expect(getAlignmentScore("p1", "math-test")).toBe(0.9);
    expect(getAlignmentScore("p2", "math-test")).toBe(0.6);

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

    // Both propose "approve": leader = 0.9+0.6 = 1.5, runnerUp = 0
    // margin = (1.5 - 0) / 1.5 = 1.0 >= 0.5
    expect(result.consensusReached).toBe(true);
    expect(result.reasoning).toContain("1.00");
    expect(result.reasoning).toContain("approve");
  });

  it("DIAL_410: 3 proposers, 2 agree, 1 disagrees — consensus reached", async () => {
    // Proposers A(0.9) and B(0.6) propose "approve" = 1.5
    // Proposer C(0.3) proposes "reject" = 0.3
    // margin = (1.5 - 0.3) / 1.8 = 0.667 >= 0.5 -> consensus
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
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Seed alignment: A=0.9, B=0.6, C=0.3
    seedAlignment("pA", "math-test", 0.9);
    seedAlignment("pB", "math-test", 0.6);
    seedAlignment("pC", "math-test", 0.3);

    expect(getAlignmentScore("pA", "math-test")).toBe(0.9);
    expect(getAlignmentScore("pB", "math-test")).toBe(0.6);
    expect(getAlignmentScore("pC", "math-test")).toBe(0.3);

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

    // approve = 0.9+0.6 = 1.5, reject = 0.3, total = 1.8
    // margin = (1.5 - 0.3) / 1.8 = 1.2/1.8 = 0.6667
    expect(result.consensusReached).toBe(true);
    expect(result.reasoning).toContain("0.67");
    expect(result.reasoning).toContain("approve");
  });

  it("DIAL_414: boundary — margin exactly equals threshold", async () => {
    // We need margin = threshold exactly.
    // With 2 proposers: one proposes "approve", one proposes "reject"
    // margin = (leaderScore - runnerUpScore) / totalAlignment
    //
    // Let's use: proposer X alignment=0.75, proposer Y alignment=0.25
    // X proposes "approve" (score=0.75), Y proposes "reject" (score=0.25)
    // total = 1.0, margin = (0.75 - 0.25) / 1.0 = 0.5
    // threshold = 0.5 -> margin >= threshold -> consensus!
    //
    // To get exact 0.75: 3 matches out of 4 comparisons
    // To get exact 0.25: 1 match out of 4 comparisons
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
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Seed exact alignment: pX = 3/4 = 0.75, pY = 1/4 = 0.25
    for (let i = 0; i < 3; i++) updateAlignment("pX", "math-test", true);
    updateAlignment("pX", "math-test", false);

    updateAlignment("pY", "math-test", true);
    for (let i = 0; i < 3; i++) updateAlignment("pY", "math-test", false);

    expect(getAlignmentScore("pX", "math-test")).toBe(0.75);
    expect(getAlignmentScore("pY", "math-test")).toBe(0.25);

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

    // margin = (0.75 - 0.25) / 1.0 = 0.5 exactly equals threshold 0.5
    expect(result.consensusReached).toBe(true);
    expect(result.reasoning).toContain("0.50");
  });

  it("DIAL_415: boundary — margin one epsilon below threshold — no consensus", async () => {
    // We need margin just below threshold.
    // Use 3 proposers to get fractional margin:
    // pA alignment=0.6, proposes "approve" (score=0.6)
    // pB alignment=0.4, proposes "reject" (score=0.4)
    // total = 1.0, margin = (0.6 - 0.4) / 1.0 = 0.2
    // threshold = 0.3 -> margin 0.2 < 0.3 -> NO consensus
    //
    // To get exact 0.6: 6 matches out of 10
    // To get exact 0.4: 4 matches out of 10
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
      strategyFnName: "aheadByK",
      threshold: 0.3,
    });

    // Seed alignment: pHigh = 6/10 = 0.6, pLow = 4/10 = 0.4
    seedAlignment("pHigh", "math-test", 0.6);
    seedAlignment("pLow", "math-test", 0.4);

    expect(getAlignmentScore("pHigh", "math-test")).toBe(0.6);
    expect(getAlignmentScore("pLow", "math-test")).toBe(0.4);

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

    // margin = (0.6 - 0.4) / 1.0 = 0.2 < 0.3 threshold
    expect(result.consensusReached).toBe(false);
    expect(result.reasoning).toContain("0.20");
    expect(result.reasoning).toContain("below threshold");
  });
});
