import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  preferFirst,
  preferHighestAlignment,
  registerProposer,
} from "../../src/dialai/index.js";
import type { SelectionVoterContext, Proposal } from "../../src/dialai/types.js";

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    proposalId: overrides.proposalId ?? "prop-1",
    sessionId: "s1",
    roundId: "r1",
    specialistId: overrides.specialistId ?? "p1",
    isHuman: false,
    transitionName: overrides.transitionName ?? "go",
    toState: overrides.toState ?? "b",
    reasoning: overrides.reasoning ?? "test",
    createdAt: overrides.createdAt ?? new Date(),
  };
}

function makeCtx(proposals: Proposal[]): SelectionVoterContext {
  return {
    sessionId: "s1",
    currentState: "a",
    prompt: "Pick one",
    machineName: "sel-test",
    proposals,
    history: [],
  };
}

describe("DIAL_165–DIAL_170: Built-in Selection Voter Strategies", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_165: preferFirst selects earliest proposal by createdAt", async () => {
    const early = makeProposal({ proposalId: "early", createdAt: new Date("2024-01-01") });
    const late = makeProposal({ proposalId: "late", createdAt: new Date("2024-06-01") });

    const result = await preferFirst(makeCtx([late, early]));

    expect(result.selectedProposalId).toBe("early");
  });

  test("DIAL_166: preferFirst throws with no proposals", async () => {
    await expect(preferFirst(makeCtx([]))).rejects.toThrow("No proposals to select from");
  });

  test("DIAL_167: preferHighestAlignment selects proposal from best-aligned specialist", async () => {
    const propLow = makeProposal({ proposalId: "prop-low", specialistId: "low" });
    const propHigh = makeProposal({ proposalId: "prop-high", specialistId: "high" });

    const ctx = makeCtx([propLow, propHigh]);
    ctx.alignmentScores = { low: 0.3, high: 0.9 };

    const result = await preferHighestAlignment(ctx);

    expect(result.selectedProposalId).toBe("prop-high");
  });

  test("DIAL_168: preferHighestAlignment falls back to first when no alignment data", async () => {
    await registerProposer({ specialistId: "p1", machineName: "sel-test", strategyFnName: "firstAvailable" });
    await registerProposer({ specialistId: "p2", machineName: "sel-test", strategyFnName: "firstAvailable" });

    const propA = makeProposal({ proposalId: "a", specialistId: "p1" });
    const propB = makeProposal({ proposalId: "b", specialistId: "p2" });

    const result = await preferHighestAlignment(makeCtx([propA, propB]));

    // All alignment 0 — picks first proposal encountered
    expect(result.selectedProposalId).toBe("a");
  });

  test("DIAL_170: all selection strategies return SelectionVoterStrategyResult shape", async () => {
    await registerProposer({ specialistId: "p1", machineName: "sel-test", strategyFnName: "firstAvailable" });
    const prop = makeProposal({ proposalId: "p1-prop", specialistId: "p1" });
    const ctx = makeCtx([prop]);

    const r1 = await preferFirst(ctx);
    expect(r1.selectedProposalId).toBeDefined();
    expect(r1.reasoning).toBeDefined();

    const r2 = await preferHighestAlignment(ctx);
    expect(r2.selectedProposalId).toBeDefined();
    expect(r2.reasoning).toBeDefined();
  });
});
