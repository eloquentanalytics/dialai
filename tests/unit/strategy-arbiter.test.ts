import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  firstProposal,
  alignmentMargin,
} from "../../src/dialai/index.js";
import type { ArbiterContext, Proposal } from "../../src/dialai/types.js";

function makeProposal(overrides: Partial<Proposal>): Proposal {
  return {
    proposalId: overrides.proposalId ?? "p-" + Math.random().toString(36).slice(2),
    sessionId: "s1",
    roundId: "r1",
    specialistId: overrides.specialistId ?? "spec1",
    isHuman: false,
    transitionName: overrides.transitionName ?? "approve",
    toState: overrides.toState ?? "approved",
    reasoning: overrides.reasoning ?? "test",
    createdAt: overrides.createdAt ?? new Date(),
  };
}

describe("DIAL_171–DIAL_178: Arbiter Strategies", () => {
  beforeEach(async () => {
    await clear();
  });

  test("DIAL_171: firstProposal returns first proposal by timestamp", async () => {
    const earlier = makeProposal({
      proposalId: "p-early",
      specialistId: "spec1",
      transitionName: "approve",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    const later = makeProposal({
      proposalId: "p-late",
      specialistId: "spec2",
      transitionName: "reject",
      createdAt: new Date("2024-01-01T00:01:00Z"),
    });

    const ctx: ArbiterContext = {
      sessionId: "s1",
      roundId: "r1",
      currentState: "pending",
      prompt: "Test?",
      machineName: "test",
      proposals: [later, earlier], // intentionally reversed
      history: [],
      threshold: 1,
    };

    const result = await firstProposal(ctx);

    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe("p-early");
  });

  test("DIAL_172: firstProposal with no proposals returns consensusReached=false", async () => {
    const ctx: ArbiterContext = {
      sessionId: "s1",
      roundId: "r1",
      currentState: "pending",
      prompt: "Test?",
      machineName: "test",
      proposals: [],
      history: [],
      threshold: 1,
    };

    const result = await firstProposal(ctx);

    expect(result.consensusReached).toBe(false);
    expect(result.winningProposalId).toBeUndefined();
  });

  test("DIAL_173: alignmentMargin with single proposal and threshold<1 reaches consensus", async () => {
    const proposal = makeProposal({
      proposalId: "p-only",
      specialistId: "spec1",
      transitionName: "approve",
    });

    const ctx: ArbiterContext = {
      sessionId: "s1",
      roundId: "r1",
      currentState: "pending",
      prompt: "Test?",
      machineName: "test",
      proposals: [proposal],
      alignmentScores: { spec1: 0.9 },
      history: [],
      threshold: 0.9,
    };

    const result = await alignmentMargin(ctx);

    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe("p-only");
  });

  test("DIAL_175: alignmentMargin counts multiple proposals per transition with alignment weighting", async () => {
    const p1 = makeProposal({
      proposalId: "p-approve1",
      specialistId: "spec1",
      transitionName: "approve",
      toState: "approved",
    });
    const p2 = makeProposal({
      proposalId: "p-approve2",
      specialistId: "spec2",
      transitionName: "approve",
      toState: "approved",
    });
    const p3 = makeProposal({
      proposalId: "p-reject1",
      specialistId: "spec3",
      transitionName: "reject",
      toState: "rejected",
    });

    // spec1: 0.8, spec2: 0.7 => approve group score = 1.5
    // spec3: 0.5 => reject group score = 0.5
    // totalAlignment = 2.0
    // margin = (1.5 - 0.5) / 2.0 = 0.5
    // threshold = 0.5 => consensus reached
    const ctx: ArbiterContext = {
      sessionId: "s1",
      roundId: "r1",
      currentState: "pending",
      prompt: "Test?",
      machineName: "test",
      proposals: [p1, p2, p3],
      alignmentScores: { spec1: 0.8, spec2: 0.7, spec3: 0.5 },
      history: [],
      threshold: 0.5,
    };

    const result = await alignmentMargin(ctx);

    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBeDefined();
    // The winning proposal should be from the "approve" group
    expect(["p-approve1", "p-approve2"]).toContain(result.winningProposalId);
  });

  test("DIAL_178: alignmentMargin default threshold is 1 when ctx.threshold is undefined (human-only)", async () => {
    const proposal = makeProposal({
      proposalId: "p-only",
      specialistId: "spec1",
      transitionName: "approve",
    });

    // Threshold omitted (undefined) defaults to 1 in alignmentMargin.
    // With threshold=1, a single proposal is still auto-approved (threshold <= 1).
    const ctx: ArbiterContext = {
      sessionId: "s1",
      roundId: "r1",
      currentState: "pending",
      prompt: "Test?",
      machineName: "test",
      proposals: [proposal],
      alignmentScores: { spec1: 0.9 },
      history: [],
      threshold: undefined,
    };

    const result = await alignmentMargin(ctx);

    // Single proposal is auto-approved even at threshold=1 (threshold <= 1)
    expect(result.consensusReached).toBe(true);
  });
});
