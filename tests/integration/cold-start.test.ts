/**
 * Integration Tests - Cold Start: Human Decision Flow
 * DIAL_285–DIAL_290
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
  evaluateConsensus,
  getExemplars,
  getAllAlignmentRecords,
  getAlignmentScore,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("Integration: Cold Start — Human Decision Flow", () => {
  beforeEach(async () => {
    await clear();
  });

  const machine: MachineDefinition = {
    machineName: "cold-start",
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

  it("DIAL_285: cold start: all AI proposals contribute 0 alignment", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "ai-1",
      machineName: "cold-start",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "ai-2",
      machineName: "cold-start",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "cold-start",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // No alignment data seeded — both AI proposers have 0 alignment
    expect(await getAlignmentScore("ai-1", "cold-start")).toBe(0);
    expect(await getAlignmentScore("ai-2", "cold-start")).toBe(0);

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
  });

  it("DIAL_286: cold start: aheadByK returns 'Cold start' reasoning", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "ai-1",
      machineName: "cold-start",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "ai-2",
      machineName: "cold-start",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "cold-start",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

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
    expect(result.reasoning).toContain("Cold start");
  });

  it("DIAL_287: cold start: human force decision succeeds", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "human",
      machineName: "cold-start",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "cold-start",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: "human",
      transitionName: "approve",
      reasoning: "Human approves",
    });

    expect(result.executed).toBe(true);
    expect(result.isHuman).toBe(true);
    expect(result.transitionName).toBe("approve");
    expect(result.toState).toBe("approved");

    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("approved");
  });

  it("DIAL_288: cold start: exemplar generated on force", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "human",
      machineName: "cold-start",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "cold-start",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: "human",
      transitionName: "approve",
      reasoning: "Human approves",
    });

    const exemplarList = await getExemplars("cold-start");
    expect(exemplarList).toHaveLength(1);
    expect(exemplarList[0].humanTransitionName).toBe("approve");
    expect(exemplarList[0].humanToState).toBe("approved");
    expect(exemplarList[0].state).toBe("pending");
  });

  it("DIAL_289: cold start: alignment scores update for all participants", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "ai-1",
      machineName: "cold-start",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "ai-2",
      machineName: "cold-start",
      strategyFnName: "lastAvailable",
    });
    await registerProposer({
      specialistId: "human",
      machineName: "cold-start",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "cold-start",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // AI proposers submit proposals before human forces
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
    await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: "human",
      transitionName: "approve",
      reasoning: "Human approves",
    });

    const records = await getAllAlignmentRecords("cold-start");
    expect(records.length).toBeGreaterThanOrEqual(2);

    // ai-1 used firstAvailable which picks "approve" — should match
    const ai1Record = records.find((r) => r.specialistId === "ai-1");
    expect(ai1Record).toBeDefined();
    expect(ai1Record!.matchingChoices).toBe(1);
    expect(ai1Record!.alignmentScore).toBeCloseTo(0.2065, 3);

    // ai-2 used lastAvailable which picks "reject" — should not match
    const ai2Record = records.find((r) => r.specialistId === "ai-2");
    expect(ai2Record).toBeDefined();
    expect(ai2Record!.matchingChoices).toBe(0);
    expect(ai2Record!.alignmentScore).toBe(0);
  });

  it("DIAL_290: first alignment data enables future contributions", async () => {
    // Round 1: human force to seed alignment
    const session1 = await createSession(machine);

    await registerProposer({
      specialistId: "ai-1",
      machineName: "cold-start",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "human",
      machineName: "cold-start",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "cold-start",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // ai-1 submits a proposal
    await submitProposal({
      sessionId: session1.sessionId,
      specialistId: "ai-1",
      roundId: session1.currentRoundId,
    });

    // Human forces "approve" — ai-1 also proposed "approve" so it gets alignment 1.0
    await submitArbitration({
      sessionId: session1.sessionId,
      roundId: session1.currentRoundId,
      specialistId: "human",
      transitionName: "approve",
      reasoning: "Human approves",
    });

    // Verify ai-1 now has non-zero alignment
    expect(await getAlignmentScore("ai-1", "cold-start")).toBeGreaterThan(0);

    // Round 2: new session, ai-1 now has alignment and can contribute to consensus
    const session2 = await createSession(machine);

    await submitProposal({
      sessionId: session2.sessionId,
      specialistId: "ai-1",
      roundId: session2.currentRoundId,
    });

    const consensusResult = await evaluateConsensus(session2.sessionId);
    // Single proposal with threshold <= 1 auto-passes in aheadByK
    expect(consensusResult.consensusReached).toBe(true);
  });
});
