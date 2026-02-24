/**
 * End-to-End Tests - Proposal Clustering
 * DIAL_359–DIAL_362
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
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("E2E: Proposal Clustering", () => {
  beforeEach(async () => {
    await clear();
  });

  const machine: MachineDefinition = {
    machineName: "clustering",
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

  it("DIAL_359: two proposers same transition — combined alignment score", async () => {
    const session = await createSession(machine);

    // Register two proposers that both pick "approve" (firstAvailable)
    await registerProposer({
      specialistId: "p1",
      machineName: "clustering",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "clustering",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "clustering",
      strategyFnName: "alignmentMargin",
      threshold: 0.5,
    });

    // Seed alignment: p1=0.8, p2=0.6
    for (let i = 0; i < 8; i++) await updateAlignment("p1", "clustering", true);
    for (let i = 0; i < 2; i++) await updateAlignment("p1", "clustering", false);
    for (let i = 0; i < 6; i++) await updateAlignment("p2", "clustering", true);
    for (let i = 0; i < 4; i++) await updateAlignment("p2", "clustering", false);

    // Both propose "approve"
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

    // Combined score for "approve" = 0.8 + 0.6 = 1.4
    // Total alignment = 1.4, margin = (1.4 - 0) / 1.4 = 1.0
    // 1.0 >= 0.5 threshold -> consensus
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
  });

  it("DIAL_360: three proposers 2-agree-1-disagrees — majority clusters", async () => {
    const session = await createSession(machine);

    // Two proposers pick "approve", one picks "reject"
    await registerProposer({
      specialistId: "p1",
      machineName: "clustering",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "clustering",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p3",
      machineName: "clustering",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "clustering",
      strategyFnName: "alignmentMargin",
      threshold: 0.5,
    });

    // Seed alignment: p1=0.5, p2=0.5, p3=0.3
    for (let i = 0; i < 5; i++) await updateAlignment("p1", "clustering", true);
    for (let i = 0; i < 5; i++) await updateAlignment("p1", "clustering", false);
    for (let i = 0; i < 5; i++) await updateAlignment("p2", "clustering", true);
    for (let i = 0; i < 5; i++) await updateAlignment("p2", "clustering", false);
    for (let i = 0; i < 3; i++) await updateAlignment("p3", "clustering", true);
    for (let i = 0; i < 7; i++) await updateAlignment("p3", "clustering", false);

    // p1 proposes "approve", p2 proposes "approve", p3 proposes "reject"
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
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p3",
      roundId: session.currentRoundId,
    });

    // "approve" cluster: 0.5 + 0.5 = 1.0
    // "reject" cluster: 0.3
    // Total = 1.3, margin = (1.0 - 0.3) / 1.3 ≈ 0.538
    // 0.538 >= 0.5 threshold -> consensus
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
  });

  it("DIAL_361: clustering with different reasoning but same transition", async () => {
    const session = await createSession(machine);

    // Both use custom strategy functions that return "approve" but with different reasoning
    await registerProposer({
      specialistId: "p1",
      machineName: "clustering",
      strategyFn: async (ctx) => ({
        transitionName: "approve",
        toState: ctx.transitions["approve"],
        reasoning: "Approve because of reason A",
      }),
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "clustering",
      strategyFn: async (ctx) => ({
        transitionName: "approve",
        toState: ctx.transitions["approve"],
        reasoning: "Approve because of reason B",
      }),
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "clustering",
      strategyFnName: "alignmentMargin",
      threshold: 0.5,
    });

    // Seed alignment
    for (let i = 0; i < 7; i++) await updateAlignment("p1", "clustering", true);
    for (let i = 0; i < 3; i++) await updateAlignment("p1", "clustering", false);
    for (let i = 0; i < 6; i++) await updateAlignment("p2", "clustering", true);
    for (let i = 0; i < 4; i++) await updateAlignment("p2", "clustering", false);

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

    // Both propose "approve" -> same cluster, different reasoning
    // Combined score = 0.7 + 0.6 = 1.3
    // Margin = (1.3 - 0) / 1.3 = 1.0 >= 0.5
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
  });

  it("DIAL_362: cluster score correctly used in margin calculation", async () => {
    const session = await createSession(machine);

    // p1 proposes "approve" (firstAvailable), p2 proposes "reject" (lastAvailable)
    await registerProposer({
      specialistId: "p1",
      machineName: "clustering",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "clustering",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "clustering",
      strategyFnName: "alignmentMargin",
      threshold: 0.6,
    });

    // Seed: p1 alignment = 0.7, p2 alignment = 0.3
    for (let i = 0; i < 7; i++) await updateAlignment("p1", "clustering", true);
    for (let i = 0; i < 3; i++) await updateAlignment("p1", "clustering", false);
    for (let i = 0; i < 3; i++) await updateAlignment("p2", "clustering", true);
    for (let i = 0; i < 7; i++) await updateAlignment("p2", "clustering", false);

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

    // "approve" cluster = 0.7, "reject" cluster = 0.3
    // total = 1.0, margin = (0.7 - 0.3) / 1.0 = 0.4
    // 0.4 < 0.6 threshold -> no consensus
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(false);
    expect(result.reasoning).toContain("below threshold");

    // Now increase p1 alignment so margin >= 0.6
    // Add more matches: p1 = (7+3)/(10+4) => need to recalculate
    for (let i = 0; i < 3; i++) await updateAlignment("p1", "clustering", true);
    // p1 alignment = 10/13 ≈ 0.769, p2 alignment = 3/10 = 0.3
    // total = 1.069, margin = (0.769 - 0.3) / 1.069 ≈ 0.439 — still below 0.6

    // Lets approach differently: add many more to p1
    for (let i = 0; i < 10; i++) await updateAlignment("p1", "clustering", true);
    // p1 = 20/23 ≈ 0.870, p2 = 0.3, total ≈ 1.170
    // margin = (0.870 - 0.3) / 1.170 ≈ 0.487 — still below 0.6

    // Lower threshold and retry with fresh session
    await clear();

    const session2 = await createSession(machine);
    await registerProposer({
      specialistId: "p1",
      machineName: "clustering",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "clustering",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "clustering",
      strategyFnName: "alignmentMargin",
      threshold: 0.3,
    });

    // p1 alignment = 0.7, p2 alignment = 0.3
    for (let i = 0; i < 7; i++) await updateAlignment("p1", "clustering", true);
    for (let i = 0; i < 3; i++) await updateAlignment("p1", "clustering", false);
    for (let i = 0; i < 3; i++) await updateAlignment("p2", "clustering", true);
    for (let i = 0; i < 7; i++) await updateAlignment("p2", "clustering", false);

    await submitProposal({
      sessionId: session2.sessionId,
      specialistId: "p1",
      roundId: session2.currentRoundId,
    });
    await submitProposal({
      sessionId: session2.sessionId,
      specialistId: "p2",
      roundId: session2.currentRoundId,
    });

    // margin = (0.7 - 0.3) / 1.0 = 0.4 >= 0.3 -> consensus
    const result2 = await evaluateConsensus(session2.sessionId);
    expect(result2.consensusReached).toBe(true);
    expect(result2.reasoning).toContain("margin");
  });
});
