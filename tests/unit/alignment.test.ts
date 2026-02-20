import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  submitProposal,
  getAlignmentScore,
  isHumanSpecialist,
  updateAlignment,
  updateAlignmentAfterHumanDecision,
  getAllAlignmentRecords,
  getProposalsForRound,
  wilsonLowerBound,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

function twoOptionMachine(): MachineDefinition {
  return {
    machineName: "align-test",
    initialState: "pending",
    goalState: "approved",
    states: {
      pending: {
        prompt: "Approve or reject?",
        transitions: { approve: "approved", reject: "rejected" },
      },
      approved: {},
      rejected: {},
    },
  };
}

/** Seeds alignment by calling updateAlignment repeatedly. */
function seedAlignment(
  specialistId: string,
  machineName: string,
  matches: number,
  total: number
): void {
  for (let i = 0; i < matches; i++) updateAlignment(specialistId, machineName, true);
  for (let i = 0; i < total - matches; i++) updateAlignment(specialistId, machineName, false);
}

describe("DIAL_198–DIAL_211: Alignment Score Tracking", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_198: new AI specialist starts at alignment 0", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    expect(getAlignmentScore("p1", "align-test")).toBe(0);
  });

  test("DIAL_199: human specialist always returns alignment 1.0", async () => {
    await registerProposer({
      specialistId: "human1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    expect(getAlignmentScore("human1", "align-test")).toBe(1.0);
  });

  test("DIAL_200: isHumanSpecialist returns true for human-registered specialist", async () => {
    await registerProposer({
      specialistId: "human1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    expect(isHumanSpecialist("human1")).toBe(true);
  });

  test("DIAL_201: isHumanSpecialist returns false for unknown specialist", () => {
    expect(isHumanSpecialist("unknown")).toBe(false);
  });

  test("DIAL_202: updateAlignment increments matching choices", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    updateAlignment("p1", "align-test", true);

    const records = getAllAlignmentRecords("align-test");
    expect(records).toHaveLength(1);
    expect(records[0].matchingChoices).toBe(1);
    expect(records[0].totalComparisons).toBe(1);
  });

  test("DIAL_203: updateAlignment increments only totalComparisons on mismatch", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    updateAlignment("p1", "align-test", false);

    const records = getAllAlignmentRecords("align-test");
    expect(records[0].matchingChoices).toBe(0);
    expect(records[0].totalComparisons).toBe(1);
  });

  test("DIAL_204: updateAlignment creates new record for first comparison", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    expect(getAllAlignmentRecords("align-test")).toHaveLength(0);

    updateAlignment("p1", "align-test", true);

    const records = getAllAlignmentRecords("align-test");
    expect(records).toHaveLength(1);
    expect(records[0].specialistId).toBe("p1");
    expect(records[0].machineName).toBe("align-test");
    expect(records[0].lastUpdated).toBeInstanceOf(Date);
  });

  test("DIAL_205: updateAlignment skips human specialists", async () => {
    await registerProposer({
      specialistId: "human1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    updateAlignment("human1", "align-test", true);

    expect(getAllAlignmentRecords("align-test")).toHaveLength(0);
  });

  test("DIAL_206: alignment score uses Wilson lower bound", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    seedAlignment("p1", "align-test", 18, 20);

    expect(getAlignmentScore("p1", "align-test")).toBeCloseTo(0.699, 2);
  });

  test("DIAL_207: updateAlignmentAfterHumanDecision checks proposers", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p-match",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p-miss",
      machineName: "align-test",
      strategyFnName: "lastAvailable",
    });

    // p-match proposes "approve", p-miss proposes "reject"
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p-match",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p-miss",
      roundId: session.currentRoundId,
    });

    const proposals = getProposalsForRound(session.sessionId, session.currentRoundId);

    // Human chose "approve"
    updateAlignmentAfterHumanDecision("align-test", "approve", proposals);

    expect(getAlignmentScore("p-match", "align-test")).toBeCloseTo(0.2065, 3);
    expect(getAlignmentScore("p-miss", "align-test")).toBe(0);
  });

  test("DIAL_211: getAllAlignmentRecords filters by machineName", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "other-machine",
      strategyFnName: "firstAvailable",
    });

    updateAlignment("p1", "align-test", true);
    updateAlignment("p2", "other-machine", true);

    const records = getAllAlignmentRecords("align-test");
    expect(records).toHaveLength(1);
    expect(records[0].specialistId).toBe("p1");
  });
});

describe("DIAL_432–DIAL_436: Wilson Score Lower Bound", () => {
  test("DIAL_432: wilsonLowerBound returns 0 for 0 total", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  test("DIAL_433: wilsonLowerBound returns low score for small sample", () => {
    // 1/1 should NOT be 1.0 — this is the key property
    const score = wilsonLowerBound(1, 1);
    expect(score).toBeCloseTo(0.2065, 3);
    expect(score).toBeLessThan(0.5);
  });

  test("DIAL_434: wilsonLowerBound confidence grows with sample size", () => {
    // Same 90% rate, but more samples → higher lower bound
    const small = wilsonLowerBound(9, 10);
    const large = wilsonLowerBound(90, 100);
    expect(large).toBeGreaterThan(small);
  });

  test("DIAL_435: wilsonLowerBound returns 0 for 0 matches", () => {
    expect(wilsonLowerBound(0, 5)).toBe(0);
  });

  test("DIAL_436: wilsonLowerBound approaches raw rate at large n", () => {
    const score = wilsonLowerBound(900, 1000);
    // Should be close to 0.9 with large sample
    expect(score).toBeGreaterThan(0.87);
    expect(score).toBeLessThan(0.92);
  });
});
