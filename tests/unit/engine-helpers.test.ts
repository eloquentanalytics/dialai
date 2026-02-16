import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  disableSpecialist,
  updateAlignment,
  getEffectiveThreshold,
  selectChampion,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("DIAL_260–DIAL_267: Engine Helpers", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_260: getEffectiveThreshold uses state-level threshold first", async () => {
    const machine: MachineDefinition = {
      machineName: "threshold-test",
      initialState: "a",
      goalState: "b",
      consensusThreshold: 0.6,
      states: {
        a: { transitions: { go: "b" }, consensusThreshold: 0.3 },
        b: {},
      },
    };
    await registerArbiter({
      specialistId: "arb",
      machineName: "threshold-test",
      strategyFnName: "firstProposal",
      threshold: 0.7,
    });

    const session = await createSession(machine);
    expect(getEffectiveThreshold(session)).toBe(0.3);
  });

  test("DIAL_261: getEffectiveThreshold falls back to machine-level", async () => {
    const machine: MachineDefinition = {
      machineName: "threshold-test",
      initialState: "a",
      goalState: "b",
      consensusThreshold: 0.6,
      states: {
        a: { transitions: { go: "b" } },
        b: {},
      },
    };
    await registerArbiter({
      specialistId: "arb",
      machineName: "threshold-test",
      strategyFnName: "firstProposal",
      threshold: 0.7,
    });

    const session = await createSession(machine);
    expect(getEffectiveThreshold(session)).toBe(0.6);
  });

  test("DIAL_262: getEffectiveThreshold falls back to arbiter threshold", async () => {
    const machine: MachineDefinition = {
      machineName: "threshold-test",
      initialState: "a",
      goalState: "b",
      states: {
        a: { transitions: { go: "b" } },
        b: {},
      },
    };
    await registerArbiter({
      specialistId: "arb",
      machineName: "threshold-test",
      strategyFnName: "firstProposal",
      threshold: 0.7,
    });

    const session = await createSession(machine);
    expect(getEffectiveThreshold(session)).toBe(0.7);
  });

  test("DIAL_263: getEffectiveThreshold defaults to 0.5", async () => {
    const machine: MachineDefinition = {
      machineName: "threshold-test",
      initialState: "a",
      goalState: "b",
      states: {
        a: { transitions: { go: "b" } },
        b: {},
      },
    };

    const session = await createSession(machine);
    expect(getEffectiveThreshold(session)).toBe(0.5);
  });

  test("DIAL_264: selectChampion returns highest-alignment proposer above threshold", async () => {
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

    // Give p1 alignment 0.7 and p2 alignment 0.9
    for (let i = 0; i < 7; i++) updateAlignment("p1", "test", true);
    for (let i = 0; i < 3; i++) updateAlignment("p1", "test", false);
    for (let i = 0; i < 9; i++) updateAlignment("p2", "test", true);
    for (let i = 0; i < 1; i++) updateAlignment("p2", "test", false);

    const champion = selectChampion("test", 0.8);
    expect(champion).toBe("p2");
  });

  test("DIAL_265: selectChampion returns undefined when no proposer qualifies", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    // Alignment 0.5 — below any reasonable threshold
    for (let i = 0; i < 5; i++) updateAlignment("p1", "test", true);
    for (let i = 0; i < 5; i++) updateAlignment("p1", "test", false);

    const champion = selectChampion("test", 0.8);
    expect(champion).toBeUndefined();
  });

  test("DIAL_266: selectChampion only considers enabled proposers", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    // Give p1 alignment 0.9
    for (let i = 0; i < 9; i++) updateAlignment("p1", "test", true);
    for (let i = 0; i < 1; i++) updateAlignment("p1", "test", false);

    disableSpecialist("p1");

    const champion = selectChampion("test", 0.8);
    expect(champion).toBeUndefined();
  });

  test("DIAL_267: selectChampion uses CHAMPION_THRESHOLD of 0.8", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    // Alignment exactly 0.8
    for (let i = 0; i < 8; i++) updateAlignment("p1", "test", true);
    for (let i = 0; i < 2; i++) updateAlignment("p1", "test", false);

    // Should qualify at threshold 0.8 (>= not >)
    const champion = selectChampion("test", 0.8);
    expect(champion).toBe("p1");

    // At threshold 0.81, should not qualify
    const noChampion = selectChampion("test", 0.81);
    expect(noChampion).toBeUndefined();
  });
});
