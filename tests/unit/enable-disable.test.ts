import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  registerProposer,
  registerArbiter,
  enableSpecialist,
  disableSpecialist,
  getEnabledProposers,
  getEnabledArbiter,
  getAlignmentScore,
  updateAlignment,
} from "../../src/dialai/index.js";

describe("DIAL_237–DIAL_248: Enable/Disable Specialists", () => {
  beforeEach(async () => {
    await clear();
  });

  test("DIAL_237: enableSpecialist sets enabled=true", async () => {
    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await disableSpecialist("p1");
    await enableSpecialist("p1");
    expect(proposer.enabled).toBe(true);
  });

  test("DIAL_238: disableSpecialist sets enabled=false", async () => {
    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await disableSpecialist("p1");
    expect(proposer.enabled).toBe(false);
  });

  test("DIAL_239: enableSpecialist throws for unknown specialist", async () => {
    await expect(enableSpecialist("unknown")).rejects.toThrow("Specialist not found");
  });

  test("DIAL_241: newly registered specialist has enabled undefined (treated as true)", async () => {
    const proposer = await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    expect(proposer.enabled).toBeUndefined();
    const enabled = await getEnabledProposers("test");
    expect(enabled).toHaveLength(1);
  });

  test("DIAL_242: disabled proposer excluded from getEnabledProposers", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "test",
      strategyFnName: "lastAvailable",
    });

    await disableSpecialist("p1");

    const enabled = await getEnabledProposers("test");
    expect(enabled).toHaveLength(1);
    expect(enabled[0].specialistId).toBe("p2");
  });

  test("DIAL_244: disabled arbiter excluded from getEnabledArbiter", async () => {
    await registerArbiter({
      specialistId: "a1",
      machineName: "test",
      strategyFnName: "firstProposal",
    });

    await disableSpecialist("a1");

    const arbiter = await getEnabledArbiter("test");
    expect(arbiter).toBeUndefined();
  });

  test("DIAL_247: re-enabling a disabled specialist works", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await disableSpecialist("p1");
    expect(await getEnabledProposers("test")).toHaveLength(0);

    await enableSpecialist("p1");
    expect(await getEnabledProposers("test")).toHaveLength(1);
  });

  test("DIAL_248: enable/disable does not affect alignment history", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    // Build some alignment
    await updateAlignment("p1", "test", true);
    await updateAlignment("p1", "test", true);
    await updateAlignment("p1", "test", false);
    const scoreBefore = await getAlignmentScore("p1", "test");

    // Disable and re-enable
    await disableSpecialist("p1");
    await enableSpecialist("p1");

    const scoreAfter = await getAlignmentScore("p1", "test");
    expect(scoreAfter).toBe(scoreBefore);
  });
});
