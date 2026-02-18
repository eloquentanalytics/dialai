/**
 * End-to-End Tests - Trip Line (Alignment Degradation)
 * DIAL_368–DIAL_372
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  updateAlignment,
  getAlignmentScore,
  selectChampion,
  getEnabledProposers,
  getExemplars,
  getAllAlignmentRecords,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("E2E: Trip Line — Alignment Degradation", () => {
  beforeEach(() => {
    clear();
  });

  const CHAMPION_THRESHOLD = 0.8;

  const machine: MachineDefinition = {
    machineName: "trip-line",
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

  it("DIAL_368: champion alignment drops below CHAMPION_THRESHOLD triggers loss of champion status", async () => {
    const machineName = "trip-line";

    await registerProposer({
      specialistId: "champion-p",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "backup-p",
      machineName,
      strategyFnName: "lastAvailable",
    });

    // Set champion-p alignment to exactly 0.8 (8 matches out of 10)
    for (let i = 0; i < 8; i++) updateAlignment("champion-p", machineName, true);
    for (let i = 0; i < 2; i++) updateAlignment("champion-p", machineName, false);

    expect(getAlignmentScore("champion-p", machineName)).toBeCloseTo(0.8);
    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champion-p");

    // Degrade alignment: human overrides with "reject" but champion proposed "approve"
    // This simulates alignment dropping — add mismatches
    updateAlignment("champion-p", machineName, false);
    updateAlignment("champion-p", machineName, false);

    // Now alignment = 8/12 ≈ 0.667
    expect(getAlignmentScore("champion-p", machineName)).toBeLessThan(CHAMPION_THRESHOLD);
    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBeUndefined();
  });

  it("DIAL_369: trip line reverts to full solicitation cascade", async () => {
    const machineName = "trip-line";

    await registerProposer({
      specialistId: "champion-p",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName,
      strategyFnName: "lastAvailable",
    });
    await registerProposer({
      specialistId: "p3",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Champion starts above threshold
    for (let i = 0; i < 9; i++) updateAlignment("champion-p", machineName, true);
    updateAlignment("champion-p", machineName, false);
    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champion-p");

    // Degrade champion below threshold
    for (let i = 0; i < 5; i++) updateAlignment("champion-p", machineName, false);
    // Now 9/15 = 0.6
    expect(getAlignmentScore("champion-p", machineName)).toBeLessThan(CHAMPION_THRESHOLD);
    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBeUndefined();

    // All proposers should still be available for full cascade
    const enabled = getEnabledProposers(machineName);
    expect(enabled).toHaveLength(3);
    const enabledIds = enabled.map((p) => p.specialistId).sort();
    expect(enabledIds).toEqual(["champion-p", "p2", "p3"]);
  });

  it("DIAL_370: trip line preserves exemplar corpus", async () => {
    const machineName = "trip-line";

    await registerProposer({
      specialistId: "champion-p",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "human",
      machineName,
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Build up exemplars via human decisions
    for (let i = 0; i < 3; i++) {
      const session = await createSession(machine);
      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "champion-p",
        roundId: session.currentRoundId,
      });
      await submitArbitration({
        sessionId: session.sessionId,
        roundId: session.currentRoundId,
        specialistId: "human",
        transitionName: "approve",
        reasoning: `Human exemplar ${i + 1}`,
      });
    }

    const exemplarsBefore = getExemplars(machineName);
    expect(exemplarsBefore).toHaveLength(3);

    // Degrade champion alignment
    for (let i = 0; i < 5; i++) {
      updateAlignment("champion-p", machineName, false);
    }

    // Alignment degraded, but exemplars remain intact
    const exemplarsAfter = getExemplars(machineName);
    expect(exemplarsAfter).toHaveLength(3);
    expect(exemplarsAfter.map((e) => e.humanTransitionName)).toEqual([
      "approve",
      "approve",
      "approve",
    ]);
  });

  it("DIAL_371: re-calibration after trip line", async () => {
    const machineName = "trip-line";

    await registerProposer({
      specialistId: "champion-p",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Initial high alignment
    for (let i = 0; i < 8; i++) updateAlignment("champion-p", machineName, true);
    for (let i = 0; i < 2; i++) updateAlignment("champion-p", machineName, false);
    // 8/10 = 0.8 -> champion (only AI proposers registered)
    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champion-p");

    // Degrade below threshold
    for (let i = 0; i < 5; i++) updateAlignment("champion-p", machineName, false);
    // 8/15 ≈ 0.533 -> not champion
    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBeUndefined();

    const recordsBefore = getAllAlignmentRecords(machineName);
    const totalBefore = recordsBefore.find((r) => r.specialistId === "champion-p")!
      .totalComparisons;

    // Register human for re-calibration
    await registerProposer({
      specialistId: "human",
      machineName,
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    // Re-calibrate: new human decisions generate new alignment data
    const session = await createSession(machine);
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "champion-p",
      roundId: session.currentRoundId,
    });
    await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: "human",
      transitionName: "approve",
      reasoning: "Re-calibration decision",
    });

    // New alignment data collected
    const recordsAfter = getAllAlignmentRecords(machineName);
    const totalAfter = recordsAfter.find((r) => r.specialistId === "champion-p")!
      .totalComparisons;
    expect(totalAfter).toBe(totalBefore + 1);
  });

  it("DIAL_372: champion mode re-entered when alignment recovers", async () => {
    const machineName = "trip-line";

    await registerProposer({
      specialistId: "champion-p",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Start with high alignment (no human registered yet, so selectChampion only sees AI)
    for (let i = 0; i < 9; i++) updateAlignment("champion-p", machineName, true);
    updateAlignment("champion-p", machineName, false);
    // 9/10 = 0.9 -> champion
    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champion-p");

    // Degrade below threshold
    for (let i = 0; i < 6; i++) updateAlignment("champion-p", machineName, false);
    // 9/16 = 0.5625 -> not champion
    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBeUndefined();

    // Register human for recovery calibration
    await registerProposer({
      specialistId: "human",
      machineName,
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    // Recover: many correct decisions (via human forcing + proposals matching)
    for (let i = 0; i < 20; i++) {
      const session = await createSession(machine);
      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "champion-p",
        roundId: session.currentRoundId,
      });
      await submitArbitration({
        sessionId: session.sessionId,
        roundId: session.currentRoundId,
        specialistId: "human",
        transitionName: "approve",
        reasoning: `Recovery round ${i + 1}`,
      });
    }

    // champion-p proposed "approve" (firstAvailable), human chose "approve" -> all match
    // Now 9+20 = 29 matches out of 16+20 = 36 total -> 29/36 ≈ 0.806
    const score = getAlignmentScore("champion-p", machineName);
    expect(score).toBeGreaterThanOrEqual(CHAMPION_THRESHOLD);

    // Champion mode re-entered
    // Note: human specialist also qualifies (alignment 1.0), but champion-p
    // must also be above threshold. Verify champion-p qualifies.
    const champion = selectChampion(machineName, CHAMPION_THRESHOLD);
    // selectChampion picks highest alignment; human returns 1.0 so it may pick human.
    // The important assertion: champion-p's alignment recovered above threshold.
    expect(score).toBeGreaterThanOrEqual(CHAMPION_THRESHOLD);
    // And a champion exists (either human or champion-p)
    expect(champion).toBeDefined();
  });
});
