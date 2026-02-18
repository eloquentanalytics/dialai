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

    expect(getAlignmentScore("consistent-bot", "alignment-growth")).toBe(1.0);
  });

  it("DIAL_292: alignment decreases with mismatches", () => {
    for (let i = 0; i < 5; i++) {
      updateAlignment("mixed-bot", "alignment-growth", true);
    }
    for (let i = 0; i < 5; i++) {
      updateAlignment("mixed-bot", "alignment-growth", false);
    }

    expect(getAlignmentScore("mixed-bot", "alignment-growth")).toBe(0.5);
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

    // high-align has alignment 0.9, low-align has alignment 0.1
    for (let i = 0; i < 9; i++) updateAlignment("high-align", "alignment-growth", true);
    updateAlignment("high-align", "alignment-growth", false);
    updateAlignment("low-align", "alignment-growth", true);
    for (let i = 0; i < 9; i++) updateAlignment("low-align", "alignment-growth", false);

    expect(getAlignmentScore("high-align", "alignment-growth")).toBeCloseTo(0.9);
    expect(getAlignmentScore("low-align", "alignment-growth")).toBeCloseTo(0.1);

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

    // margin = (0.9 - 0.1) / 1.0 = 0.8 >= 0.5 threshold
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
      threshold: 0.5,
    });

    // low-bot alignment = 0.3, high-bot alignment = 0.7
    for (let i = 0; i < 3; i++) updateAlignment("low-bot", "alignment-growth", true);
    for (let i = 0; i < 7; i++) updateAlignment("low-bot", "alignment-growth", false);
    for (let i = 0; i < 7; i++) updateAlignment("high-bot", "alignment-growth", true);
    for (let i = 0; i < 3; i++) updateAlignment("high-bot", "alignment-growth", false);

    expect(getAlignmentScore("low-bot", "alignment-growth")).toBeCloseTo(0.3);
    expect(getAlignmentScore("high-bot", "alignment-growth")).toBeCloseTo(0.7);

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

    // high-bot leads: margin = (0.7 - 0.3) / 1.0 = 0.4 < 0.5 threshold
    // low-bot does NOT have consensus despite proposing — the higher-aligned opponent blocks it
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(false);
  });
});
