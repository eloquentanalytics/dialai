import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  registerProposer,
  getSpecialist,
} from "../../src/dialai/index.js";
import type { ProposerContext, ProposerStrategyResult } from "../../src/dialai/types.js";

describe("DIAL_026–DIAL_037: Specialist Registration — Proposers", () => {
  beforeEach(async () => {
    await clear();
  });

  test("DIAL_026: registers proposer with strategyFn (mode 1)", async () => {
    const strategyFn = async (_ctx: ProposerContext): Promise<ProposerStrategyResult> => ({
      transitionName: "go",
      toState: "b",
      reasoning: "test",
    });

    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFn,
    });

    expect(proposer.role).toBe("proposer");
    expect(proposer.specialistId).toBe("p1");
    expect(proposer.strategyFn).toBe(strategyFn);
  });

  test("DIAL_027: registers proposer with strategyWebhookUrl (mode 2)", async () => {
    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyWebhookUrl: "https://example.com/propose",
      webhookTokenName: "MY_TOKEN",
    });

    expect(proposer.strategyWebhookUrl).toBe("https://example.com/propose");
    expect(proposer.webhookTokenName).toBe("MY_TOKEN");
  });

  test("DIAL_028: registers proposer with contextFn + modelId (mode 3)", async () => {
    const contextFn = async (_ctx: ProposerContext) => "prompt text";

    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      contextFn,
      modelId: "gpt-4",
    });

    expect(proposer.contextFn).toBe(contextFn);
    expect(proposer.modelId).toBe("gpt-4");
  });

  test("DIAL_029: registers proposer with contextWebhookUrl + modelId (mode 4)", async () => {
    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      contextWebhookUrl: "https://example.com/context",
      modelId: "gpt-4",
      webhookTokenName: "MY_TOKEN",
    });

    expect(proposer.contextWebhookUrl).toBe("https://example.com/context");
    expect(proposer.modelId).toBe("gpt-4");
  });

  test("DIAL_030: registers proposer with strategyFnName (mode 5)", async () => {
    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    expect(proposer.strategyFnName).toBe("firstAvailable");
  });

  test("DIAL_031: registers human proposer", async () => {
    const proposer = await registerProposer({
      specialistId: "human1",
      machineName: "test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    expect(proposer.isHuman).toBe(true);
  });

  test("DIAL_032: rejects multiple execution modes", async () => {
    await expect(
      registerProposer({
        specialistId: "p1",
        machineName: "test",
        strategyFnName: "firstAvailable",
        strategyFn: async () => ({ transitionName: "go", toState: "b", reasoning: "" }),
      })
    ).rejects.toThrow("Provide either strategyFn (custom function) or strategyFnName (built-in strategy), not both.");
  });

  test("DIAL_033: rejects no execution mode", async () => {
    await expect(
      registerProposer({
        specialistId: "p1",
        machineName: "test",
      })
    ).rejects.toThrow("Specialist must specify one of:");
  });

  test("DIAL_034: rejects unknown strategyFnName", async () => {
    await expect(
      registerProposer({
        specialistId: "p1",
        machineName: "test",
        strategyFnName: "nonexistent",
      })
    ).rejects.toThrow("Unknown proposer strategy");
  });

  test("DIAL_035: rejects duplicate specialistId", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await expect(
      registerProposer({
        specialistId: "p1",
        machineName: "test",
        strategyFnName: "firstAvailable",
      })
    ).rejects.toThrow("Specialist already exists");
  });

  test("DIAL_036: registers proposer with optional threshold", async () => {
    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
      threshold: 0.8,
    });

    expect(proposer.threshold).toBe(0.8);
  });

  test("DIAL_037: proposer stored in specialists map", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    const stored = await getSpecialist("p1");
    expect(stored).toBeDefined();
    expect(stored!.role).toBe("proposer");
    expect(stored!.specialistId).toBe("p1");
  });
});
