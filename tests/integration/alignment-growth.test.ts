/**
 * Integration Tests - Progressive Alignment Growth
 * DIAL_291–DIAL_294
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
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("Integration: Progressive Alignment Growth", () => {
  beforeEach(() => {
    clear();
  });

  const machine: MachineDefinition = {
    machineName: "alignment-growth",
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

  it("DIAL_291: alignment grows with consistent matching", () => {
    // Need to register so isHumanSpecialist check works
    // updateAlignment directly doesn't require registration for non-human specialists
    for (let i = 0; i < 10; i++) {
      updateAlignment("consistent-bot", "alignment-growth", true);
    }

    // Wilson(10,10) ≈ 0.7225 — confidence grows with more evidence
    const score = getAlignmentScore("consistent-bot", "alignment-growth");
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThan(1.0);
  });

  it("DIAL_292: alignment decreases with mismatches", () => {
    for (let i = 0; i < 5; i++) {
      updateAlignment("mixed-bot", "alignment-growth", true);
    }
    for (let i = 0; i < 5; i++) {
      updateAlignment("mixed-bot", "alignment-growth", false);
    }

    // Wilson(5,10) ≈ 0.2366
    expect(getAlignmentScore("mixed-bot", "alignment-growth")).toBeCloseTo(0.2366, 2);
  });

  it("DIAL_293: high-alignment specialist reaches consensus faster", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "high-align",
      machineName: "alignment-growth",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "low-align",
      machineName: "alignment-growth",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "alignment-growth",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // high-align has alignment 9/10 → Wilson ≈ 0.60, low-align has alignment 1/10 → Wilson ≈ 0.02
    for (let i = 0; i < 9; i++) updateAlignment("high-align", "alignment-growth", true);
    updateAlignment("high-align", "alignment-growth", false);
    updateAlignment("low-align", "alignment-growth", true);
    for (let i = 0; i < 9; i++) updateAlignment("low-align", "alignment-growth", false);

    expect(getAlignmentScore("high-align", "alignment-growth")).toBeCloseTo(0.5958, 2);
    expect(getAlignmentScore("low-align", "alignment-growth")).toBeCloseTo(0.0179, 2);

    // Both submit opposing proposals
    // high-align uses firstAvailable -> "approve"
    // low-align uses lastAvailable -> "reject"
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "high-align",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "low-align",
      roundId: session.currentRoundId,
    });

    // margin = (0.60 - 0.02) / (0.60 + 0.02) ≈ 0.94 >= 0.5 threshold
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.reasoning).toContain("approve");
  });

  it("DIAL_294: low-alignment specialist insufficient alone against high opponent", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "low-bot",
      machineName: "alignment-growth",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "high-bot",
      machineName: "alignment-growth",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "alignment-growth",
      strategyFnName: "aheadByK",
      threshold: 0.6,
    });

    // low-bot alignment 3/10 → Wilson ≈ 0.108, high-bot alignment 7/10 → Wilson ≈ 0.397
    for (let i = 0; i < 3; i++) updateAlignment("low-bot", "alignment-growth", true);
    for (let i = 0; i < 7; i++) updateAlignment("low-bot", "alignment-growth", false);
    for (let i = 0; i < 7; i++) updateAlignment("high-bot", "alignment-growth", true);
    for (let i = 0; i < 3; i++) updateAlignment("high-bot", "alignment-growth", false);

    expect(getAlignmentScore("low-bot", "alignment-growth")).toBeCloseTo(0.108, 2);
    expect(getAlignmentScore("high-bot", "alignment-growth")).toBeCloseTo(0.397, 2);

    // low-bot proposes "approve" (firstAvailable), high-bot proposes "reject" (lastAvailable)
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "low-bot",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "high-bot",
      roundId: session.currentRoundId,
    });

    // high-bot leads: margin = (0.397 - 0.108) / (0.397 + 0.108) ≈ 0.57 < 0.6 threshold
    // low-bot does NOT have consensus despite proposing — the higher-aligned opponent blocks it
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(false);
  });
});
