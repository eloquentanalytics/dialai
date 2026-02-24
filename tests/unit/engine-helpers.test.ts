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
  beforeEach(async () => {
    await clear();
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
    expect(await getEffectiveThreshold(session)).toBe(0.3);
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
    expect(await getEffectiveThreshold(session)).toBe(0.6);
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
    expect(await getEffectiveThreshold(session)).toBe(0.7);
  });

  test("DIAL_263: getEffectiveThreshold returns undefined when nothing configured", async () => {
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
    expect(await getEffectiveThreshold(session)).toBeUndefined();
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

    // Give p1 alignment 7/10 → Wilson ~0.40, p2 alignment 9/10 → Wilson ~0.60
    for (let i = 0; i < 7; i++) await updateAlignment("p1", "test", true);
    for (let i = 0; i < 3; i++) await updateAlignment("p1", "test", false);
    for (let i = 0; i < 9; i++) await updateAlignment("p2", "test", true);
    for (let i = 0; i < 1; i++) await updateAlignment("p2", "test", false);

    // Lower threshold so p2 (Wilson ~0.60) qualifies
    const champion = await selectChampion("test", 0.5);
    expect(champion).toBe("p2");
  });

  test("DIAL_265: selectChampion returns undefined when no proposer qualifies", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    // Alignment 0.5 — below any reasonable threshold
    for (let i = 0; i < 5; i++) await updateAlignment("p1", "test", true);
    for (let i = 0; i < 5; i++) await updateAlignment("p1", "test", false);

    const champion = await selectChampion("test", 0.8);
    expect(champion).toBeUndefined();
  });

  test("DIAL_266: selectChampion only considers enabled proposers", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    // Give p1 alignment 45/50 → Wilson ~0.82
    for (let i = 0; i < 45; i++) await updateAlignment("p1", "test", true);
    for (let i = 0; i < 5; i++) await updateAlignment("p1", "test", false);

    await disableSpecialist("p1");

    const champion = await selectChampion("test", 0.8);
    expect(champion).toBeUndefined();
  });

  test("DIAL_267: selectChampion uses CHAMPION_THRESHOLD of 0.8", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    // 90/100 → Wilson ~0.83, should qualify at 0.8
    for (let i = 0; i < 90; i++) await updateAlignment("p1", "test", true);
    for (let i = 0; i < 10; i++) await updateAlignment("p1", "test", false);

    // Should qualify at threshold 0.8 (>= not >)
    const champion = await selectChampion("test", 0.8);
    expect(champion).toBe("p1");

    // At threshold 0.85, should not qualify
    const noChampion = await selectChampion("test", 0.85);
    expect(noChampion).toBeUndefined();
  });
});
