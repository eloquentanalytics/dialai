/**
 * Integration Tests - Human Primacy
 * DIAL_327–DIAL_335
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  getSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  updateAlignment,
  getExemplars,
  getAllAlignmentRecords,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("Integration: Human Primacy", () => {
  beforeEach(() => {
    clear();
  });

  const machine: MachineDefinition = {
    machineName: "human-primacy",
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

  it("DIAL_330: human force bypasses consensus score entirely", async () => {
    const session = await createSession(machine);

    // Register two AI proposers with high alignment that both propose "approve"
    await registerProposer({
      specialistId: "ai-1",
      machineName: "human-primacy",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "ai-2",
      machineName: "human-primacy",
      strategyFnName: "firstAvailable",
    });
    // Register human proposer
    await registerProposer({
      specialistId: "human",
      machineName: "human-primacy",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "human-primacy",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Seed high alignment for AI proposers
    for (let i = 0; i < 10; i++) updateAlignment("ai-1", "human-primacy", true);
    for (let i = 0; i < 10; i++) updateAlignment("ai-2", "human-primacy", true);

    // Both AI proposers submit "approve" (firstAvailable)
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "ai-1",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "ai-2",
      roundId: session.currentRoundId,
    });

    // Human forces "reject" — overriding the AI consensus for "approve"
    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: "human",
      transitionName: "reject",
      reasoning: "Human disagrees with AI consensus",
    });

    expect(result.executed).toBe(true);
    expect(result.isHuman).toBe(true);
    expect(result.transitionName).toBe("reject");
    expect(result.toState).toBe("rejected");

    // The session moved to "rejected", not "approved"
    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("rejected");

    // Exemplar was created capturing the human decision
    const exemplarList = getExemplars("human-primacy");
    expect(exemplarList).toHaveLength(1);
    expect(exemplarList[0].humanTransitionName).toBe("reject");

    // Alignment records updated — AI proposers that proposed "approve" get a mismatch
    const records = getAllAlignmentRecords("human-primacy");
    const ai1Record = records.find((r) => r.specialistId === "ai-1");
    const ai2Record = records.find((r) => r.specialistId === "ai-2");

    expect(ai1Record).toBeDefined();
    expect(ai2Record).toBeDefined();

    // Both AI proposed "approve" but human chose "reject" — mismatch added
    // Pre-seeded: 10 matching out of 10. Human force adds 1 non-matching.
    // Result: 10 matching out of 11 total.
    expect(ai1Record!.matchingChoices).toBe(10);
    expect(ai1Record!.totalComparisons).toBe(11);
    expect(ai2Record!.matchingChoices).toBe(10);
    expect(ai2Record!.totalComparisons).toBe(11);

    // Alignment score uses Wilson lower bound: Wilson(10,11) ≈ 0.623
    expect(ai1Record!.alignmentScore).toBeCloseTo(0.623, 2);
    expect(ai2Record!.alignmentScore).toBeCloseTo(0.623, 2);
  });
});
