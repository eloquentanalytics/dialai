import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  registerProposer,
  createExemplar,
  evaluateAlignment,
  evaluateAccuracy,
} from "../../src/dialai/index.js";
import type { ProposerContext, Proposal } from "../../src/dialai/types.js";

function makeContext(overrides?: Partial<ProposerContext>): ProposerContext {
  return {
    sessionId: overrides?.sessionId ?? "s1",
    currentState: overrides?.currentState ?? "pending",
    prompt: overrides?.prompt ?? "Approve or reject?",
    transitions: overrides?.transitions ?? { approve: "approved", reject: "rejected" },
    history: overrides?.history ?? [],
  };
}

function makeProposal(overrides?: Partial<Proposal>): Proposal {
  return {
    proposalId: overrides?.proposalId ?? "p-" + Math.random().toString(36).slice(2),
    sessionId: overrides?.sessionId ?? "s1",
    roundId: overrides?.roundId ?? "r1",
    specialistId: overrides?.specialistId ?? "spec1",
    isHuman: overrides?.isHuman ?? false,
    transitionName: overrides?.transitionName ?? "approve",
    toState: overrides?.toState ?? "approved",
    reasoning: overrides?.reasoning ?? "test reasoning",
    costUSD: overrides?.costUSD,
    latencyMsec: overrides?.latencyMsec,
    createdAt: overrides?.createdAt ?? new Date(),
  };
}

const MACHINE_NAME = "eval-test";

describe("DIAL_223–DIAL_235: Evaluation System", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_223: evaluateAlignment returns correct score from exemplars", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    // Exemplar 1: specialist matches human choice (approve)
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );

    // Exemplar 2: specialist does NOT match human choice (human chose reject, specialist chose approve)
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );

    const result = evaluateAlignment("spec1", MACHINE_NAME);

    expect(result.totalExemplars).toBe(2);
    expect(result.matchingDecisions).toBe(1);
    expect(result.alignmentScore).toBeCloseTo(0.5);
  });

  test("DIAL_224: evaluateAlignment counts matching proposals by transitionName", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    // All 3 exemplars: specialist proposes "approve"
    // Exemplar 1 and 2: human chose "approve" (matches)
    // Exemplar 3: human chose "reject" (no match)
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve" })]
    );
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve" })]
    );
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve" })]
    );

    const result = evaluateAlignment("spec1", MACHINE_NAME);

    expect(result.matchingDecisions).toBe(2);
    expect(result.totalExemplars).toBe(3);
  });

  test("DIAL_227: evaluateAlignment with maxRounds limits exemplars checked", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    // Exemplar 1: match
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve" })]
    );
    // Exemplar 2: no match
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve" })]
    );
    // Exemplar 3: match (should be excluded by maxRounds=2)
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve" })]
    );

    const result = evaluateAlignment("spec1", MACHINE_NAME, { maxRounds: 2 });

    expect(result.totalExemplars).toBe(2);
    expect(result.matchingDecisions).toBe(1);
    expect(result.alignmentScore).toBeCloseTo(0.5);
  });

  test("DIAL_228: evaluateAlignment returns 0 with no exemplars", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    const result = evaluateAlignment("spec1", MACHINE_NAME);

    expect(result.totalExemplars).toBe(0);
    expect(result.matchingDecisions).toBe(0);
    expect(result.alignmentScore).toBe(0);
  });

  test("DIAL_230: evaluateAccuracy returns transitionMatchRate", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    // Exemplar 1: transition matches
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );
    // Exemplar 2: transition does NOT match
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );

    const result = evaluateAccuracy("spec1", MACHINE_NAME);

    expect(result.totalDecisions).toBe(2);
    expect(result.transitionMatchRate).toBeCloseTo(0.5);
  });

  test("DIAL_231: evaluateAccuracy returns stateMatchRate", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    // Exemplar 1: toState matches humanToState
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );
    // Exemplar 2: toState does NOT match humanToState
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );

    const result = evaluateAccuracy("spec1", MACHINE_NAME);

    expect(result.totalDecisions).toBe(2);
    expect(result.stateMatchRate).toBeCloseTo(0.5);
  });

  test("DIAL_232: evaluateAccuracy returns totalCostUSD", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", costUSD: 0.05 })]
    );
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", costUSD: 0.10 })]
    );

    const result = evaluateAccuracy("spec1", MACHINE_NAME);

    expect(result.totalCostUSD).toBeCloseTo(0.15);
  });

  test("DIAL_233: evaluateAccuracy returns avgLatencyMsec", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", latencyMsec: 100 })]
    );
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", latencyMsec: 200 })]
    );

    const result = evaluateAccuracy("spec1", MACHINE_NAME);

    expect(result.avgLatencyMsec).toBeCloseTo(150);
  });

  test("DIAL_234: evaluateAccuracy with lookback limits exemplars to last N", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    // Exemplar 1: match (should be excluded by lookback=2, only last 2 used)
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );
    // Exemplar 2: no match
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );
    // Exemplar 3: no match
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "spec1", transitionName: "approve", toState: "approved" })]
    );

    const result = evaluateAccuracy("spec1", MACHINE_NAME, { lookback: 2 });

    // Only last 2 exemplars checked: both are mismatches
    expect(result.totalDecisions).toBe(2);
    expect(result.transitionMatchRate).toBeCloseTo(0);
  });

  test("DIAL_235: evaluateAccuracy returns 0 rates when specialist never proposed in exemplars", async () => {
    await registerProposer({
      specialistId: "spec1",
      machineName: MACHINE_NAME,
      strategyFnName: "firstAvailable",
    });

    // Exemplars exist but spec1 has no proposals in them
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "approve",
      "approved",
      [makeProposal({ specialistId: "other-spec", transitionName: "approve" })]
    );
    createExemplar(
      MACHINE_NAME,
      "pending",
      makeContext(),
      "reject",
      "rejected",
      [makeProposal({ specialistId: "other-spec", transitionName: "reject" })]
    );

    const result = evaluateAccuracy("spec1", MACHINE_NAME);

    expect(result.totalDecisions).toBe(0);
    expect(result.transitionMatchRate).toBe(0);
    expect(result.stateMatchRate).toBe(0);
    expect(result.totalCostUSD).toBe(0);
    expect(result.avgLatencyMsec).toBe(0);
  });
});
