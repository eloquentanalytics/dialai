import { describe, test, expect, beforeEach } from "vitest";
import { clear, registerArbiter } from "../../src/dialai/index.js";
import type { ArbiterContext, ArbiterStrategyResult } from "../../src/dialai/types.js";

describe("DIAL_049–DIAL_051: Specialist Registration — Arbiters", () => {
  beforeEach(async () => {
    await clear();
  });

  test("DIAL_049: registers arbiter with strategyFn", async () => {
    const strategyFn = async (_ctx: ArbiterContext): Promise<ArbiterStrategyResult> => ({
      consensusReached: true,
      winningProposalId: "p1",
      reasoning: "test",
    });

    const arbiter = await registerArbiter({
      specialistId: "a1",
      machineName: "test",
      strategyFn,
    });

    expect(arbiter.role).toBe("arbiter");
    expect(arbiter.specialistId).toBe("a1");
    expect(arbiter.strategyFn).toBe(strategyFn);
  });

  test("DIAL_050: registers arbiter with strategyFnName", async () => {
    const arbiter = await registerArbiter({
      specialistId: "a1",
      machineName: "test",
      strategyFnName: "alignmentMargin",
    });

    expect(arbiter.strategyFnName).toBe("alignmentMargin");
  });

  test("DIAL_051: registers arbiter with strategyWebhookUrl", async () => {
    const arbiter = await registerArbiter({
      specialistId: "a1",
      machineName: "test",
      strategyWebhookUrl: "https://example.com/arbitrate",
      webhookTokenName: "MY_TOKEN",
    });

    expect(arbiter.strategyWebhookUrl).toBe("https://example.com/arbitrate");
    expect(arbiter.webhookTokenName).toBe("MY_TOKEN");
  });
});
