import { describe, test, expect, beforeEach } from "vitest";
import { clear, registerVoter } from "../../src/dialai/index.js";
import type {
  VoterContext,
  VoterStrategyResult,
  SelectionVoterContext,
  SelectionVoterStrategyResult,
} from "../../src/dialai/types.js";

describe("DIAL_038–DIAL_048: Specialist Registration — Voters", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_038: registers pairwise voter with strategyFn", async () => {
    const strategyFn = async (_ctx: VoterContext): Promise<VoterStrategyResult> => ({
      voteFor: "A",
      reasoning: "test",
    });

    const voter = await registerVoter({
      specialistId: "v1",
      machineName: "test",
      voterType: "pairwise",
      strategyFn,
    });

    expect(voter.role).toBe("voter");
    expect(voter.voterType).toBe("pairwise");
    expect(voter.strategyFn).toBe(strategyFn);
  });

  test("DIAL_039: registers pairwise voter with strategyFnName", async () => {
    const voter = await registerVoter({
      specialistId: "v1",
      machineName: "test",
      strategyFnName: "preferA",
    });

    expect(voter.strategyFnName).toBe("preferA");
  });

  test("DIAL_040: registers selection voter with selectionStrategyFn", async () => {
    const selectionStrategyFn = async (
      _ctx: SelectionVoterContext
    ): Promise<SelectionVoterStrategyResult> => ({
      selectedProposalId: "p1",
      reasoning: "test",
    });

    const voter = await registerVoter({
      specialistId: "v1",
      machineName: "test",
      voterType: "selection",
      selectionStrategyFn,
    });

    expect(voter.voterType).toBe("selection");
    expect(voter.selectionStrategyFn).toBe(selectionStrategyFn);
  });

  test("DIAL_041: registers selection voter with strategyFnName", async () => {
    // Note: registration validates strategyFnName against pairwise voterStrategies,
    // so selection voters using strategyFnName must use a pairwise strategy name.
    // At vote time, submitSelectionVote resolves via selectionVoterStrategies.
    const voter = await registerVoter({
      specialistId: "v1",
      machineName: "test",
      voterType: "selection",
      strategyFnName: "preferA",
    });

    expect(voter.voterType).toBe("selection");
    expect(voter.strategyFnName).toBe("preferA");
  });

  test("DIAL_042: voterType defaults to pairwise", async () => {
    const voter = await registerVoter({
      specialistId: "v1",
      machineName: "test",
      strategyFnName: "preferA",
    });

    expect(voter.voterType).toBe("pairwise");
  });

  test("DIAL_043: registers human voter", async () => {
    const voter = await registerVoter({
      specialistId: "v1",
      machineName: "test",
      strategyFnName: "preferA",
      isHuman: true,
    });

    expect(voter.isHuman).toBe(true);
  });

  test("DIAL_048: voter accepts all built-in pairwise strategies", async () => {
    const strategies = [
      "preferA",
      "preferB",
      "both",
      "neither",
      "random",
      "randomAll",
      "preferGoal",
      "preferShorterPath",
    ];

    for (let i = 0; i < strategies.length; i++) {
      const voter = await registerVoter({
        specialistId: `v${i}`,
        machineName: "test",
        strategyFnName: strategies[i],
      });
      expect(voter.strategyFnName).toBe(strategies[i]);
    }
  });
});
