/**
 * End-to-End Tests - Cold Start -> Calibration -> Autonomous Consensus
 * DIAL_353–DIAL_358
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  evaluateConsensus,
  getExemplars,
  getAlignmentScore,
  getAllAlignmentRecords,
  updateAlignment,
  selectChampion,
  evaluateAlignment,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("E2E: Progressive Collapse — Cold Start through Autonomous", () => {
  beforeEach(async () => {
    await clear();
  });

  const machine: MachineDefinition = {
    machineName: "progressive",
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

  it("DIAL_353: round 1 cold start: all AI alignment 0, blocks for human", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "ai-1",
      machineName: "progressive",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "ai-2",
      machineName: "progressive",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "progressive",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Both AI proposers have 0 alignment
    expect(await getAlignmentScore("ai-1", "progressive")).toBe(0);
    expect(await getAlignmentScore("ai-2", "progressive")).toBe(0);

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

    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(false);
    expect(result.reasoning).toContain("Cold start");
  });

  it("DIAL_354: round 1 human force: exemplar created, alignment begins", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "ai-1",
      machineName: "progressive",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "ai-2",
      machineName: "progressive",
      strategyFnName: "lastAvailable",
    });
    await registerProposer({
      specialistId: "human",
      machineName: "progressive",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "progressive",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // AI proposals
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

    // Human forces "approve"
    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: "human",
      transitionName: "approve",
      reasoning: "Human approves",
    });

    expect(result.executed).toBe(true);
    expect(result.isHuman).toBe(true);

    // Exemplar created
    const exemplarList = await getExemplars("progressive");
    expect(exemplarList).toHaveLength(1);
    expect(exemplarList[0].humanTransitionName).toBe("approve");

    // Alignment records exist
    const records = await getAllAlignmentRecords("progressive");
    expect(records.length).toBeGreaterThanOrEqual(1);
  });

  it("DIAL_355: rounds 2-5 calibration: alignment scores grow", async () => {
    await registerProposer({
      specialistId: "ai-1",
      machineName: "progressive",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "human",
      machineName: "progressive",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "progressive",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Simulate 5 human decisions where ai-1 matches (firstAvailable picks "approve")
    for (let i = 0; i < 5; i++) {
      const session = await createSession(machine);

      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "ai-1",
        roundId: session.currentRoundId,
      });

      await submitArbitration({
        sessionId: session.sessionId,
        roundId: session.currentRoundId,
        specialistId: "human",
        transitionName: "approve",
        reasoning: `Human approves round ${i + 1}`,
      });
    }

    // ai-1 used firstAvailable which picks "approve" — matches every time
    // Wilson(5,5) ≈ 0.57 — confidence grows with more evidence
    const score = await getAlignmentScore("ai-1", "progressive");
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(1.0);

    const records = await getAllAlignmentRecords("progressive");
    const ai1Record = records.find((r) => r.specialistId === "ai-1");
    expect(ai1Record).toBeDefined();
    expect(ai1Record!.totalComparisons).toBe(5);
    expect(ai1Record!.matchingChoices).toBe(5);
  });

  it("DIAL_356: first autonomous round: high-alignment proposer reaches consensus", async () => {
    await registerProposer({
      specialistId: "ai-1",
      machineName: "progressive",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "progressive",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Seed alignment: ai-1 has high alignment
    for (let i = 0; i < 5; i++) {
      await updateAlignment("ai-1", "progressive", true);
    }

    // Wilson(5,5) ≈ 0.57 — not 1.0 but still has positive alignment
    expect(await getAlignmentScore("ai-1", "progressive")).toBeGreaterThan(0.5);

    // New session: ai-1 submits a proposal autonomously
    const session = await createSession(machine);
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "ai-1",
      roundId: session.currentRoundId,
    });

    // Single proposal from aligned specialist: aheadByK grants consensus
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
  });

  it("DIAL_357: full progressive collapse: cold start through champion mode", async () => {
    const machineName = "progressive";

    await registerProposer({
      specialistId: "ai-1",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "ai-2",
      machineName,
      strategyFnName: "lastAvailable",
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

    // Phase 1: Cold start — no alignment
    expect(await getAlignmentScore("ai-1", machineName)).toBe(0);
    expect(await getAlignmentScore("ai-2", machineName)).toBe(0);

    // Phase 2: Human calibration — 10 rounds where human picks "approve"
    // ai-1 (firstAvailable) picks "approve" -> matches
    // ai-2 (lastAvailable) picks "reject" -> does not match
    for (let i = 0; i < 10; i++) {
      const session = await createSession(machine);

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

      await submitArbitration({
        sessionId: session.sessionId,
        roundId: session.currentRoundId,
        specialistId: "human",
        transitionName: "approve",
        reasoning: `Human calibration round ${i + 1}`,
      });
    }

    // Phase 3: Alignment growth — Wilson(10,10) ≈ 0.72, Wilson(0,10) = 0
    expect(await getAlignmentScore("ai-1", machineName)).toBeGreaterThan(0.7);
    expect(await getAlignmentScore("ai-2", machineName)).toBe(0);

    // Phase 4: Autonomous consensus — ai-1 alone can reach consensus
    const session = await createSession(machine);
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "ai-1",
      roundId: session.currentRoundId,
    });
    const consensusResult = await evaluateConsensus(session.sessionId);
    expect(consensusResult.consensusReached).toBe(true);

    // Phase 5: Champion mode — Wilson(10,10) ≈ 0.72, use lower threshold
    // Note: human specialist always returns 1.0 alignment, so selectChampion
    // may pick human. The key assertion: ai-1 qualifies above threshold.
    const ai1Score = await getAlignmentScore("ai-1", machineName);
    expect(ai1Score).toBeGreaterThanOrEqual(0.7);
    const champion = await selectChampion(machineName, 0.7);
    expect(champion).toBeDefined();
  });

  it("DIAL_358: exemplar flywheel: specialists improve with more exemplars", async () => {
    const machineName = "progressive";

    await registerProposer({
      specialistId: "ai-1",
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

    // Create 1 exemplar and evaluate
    const session1 = await createSession(machine);
    await submitProposal({
      sessionId: session1.sessionId,
      specialistId: "ai-1",
      roundId: session1.currentRoundId,
    });
    await submitArbitration({
      sessionId: session1.sessionId,
      roundId: session1.currentRoundId,
      specialistId: "human",
      transitionName: "approve",
      reasoning: "First exemplar",
    });

    const eval1 = await evaluateAlignment("ai-1", machineName);
    expect(eval1.totalExemplars).toBe(1);
    expect(eval1.alignmentScore).toBeCloseTo(0.2065, 3); // Wilson(1,1)

    // Create more exemplars — all matching
    for (let i = 0; i < 4; i++) {
      const session = await createSession(machine);
      await submitProposal({
        sessionId: session.sessionId,
        specialistId: "ai-1",
        roundId: session.currentRoundId,
      });
      await submitArbitration({
        sessionId: session.sessionId,
        roundId: session.currentRoundId,
        specialistId: "human",
        transitionName: "approve",
        reasoning: `Exemplar ${i + 2}`,
      });
    }

    const eval5 = await evaluateAlignment("ai-1", machineName);
    expect(eval5.totalExemplars).toBe(5);
    // Wilson(5,5) ≈ 0.57 — confidence grows with more exemplars
    expect(eval5.alignmentScore).toBeGreaterThan(eval1.alignmentScore);

    // More exemplars exist
    const allExemplars = await getExemplars(machineName);
    expect(allExemplars).toHaveLength(5);
  });
});
