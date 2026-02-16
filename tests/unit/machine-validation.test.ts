import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  validateMachine,
  normalizeMachine,
  createSession,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("DIAL_011–DIAL_025: Machine Definition Validation", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_011: rejects non-object input", () => {
    expect(() => validateMachine(null)).toThrow();
    expect(() => validateMachine("string")).toThrow();
    expect(() => validateMachine(undefined)).toThrow();
    expect(() => validateMachine(42)).toThrow();
  });

  test("DIAL_012: rejects machine missing machineName", () => {
    expect(() =>
      validateMachine({
        initialState: "a",
        goalState: "b",
        states: { a: {}, b: {} },
      })
    ).toThrow("missing or invalid machineName");
  });

  test("DIAL_013: rejects machine with empty machineName", () => {
    expect(() =>
      validateMachine({
        machineName: "",
        initialState: "a",
        goalState: "b",
        states: { a: {}, b: {} },
      })
    ).toThrow("missing or invalid machineName");
  });

  test("DIAL_014: rejects machine missing initialState", () => {
    expect(() =>
      validateMachine({
        machineName: "test",
        goalState: "b",
        states: { a: {}, b: {} },
      })
    ).toThrow("missing or invalid initialState");
  });

  test("DIAL_015: rejects machine missing goalState", () => {
    expect(() =>
      validateMachine({
        machineName: "test",
        initialState: "a",
        states: { a: {}, b: {} },
      })
    ).toThrow("missing or invalid goalState");
  });

  test("DIAL_016: rejects machine with missing states", () => {
    expect(() =>
      validateMachine({
        machineName: "test",
        initialState: "a",
        goalState: "b",
      })
    ).toThrow("missing or invalid states");
  });

  test("DIAL_017: rejects machine where initialState not in states", () => {
    expect(() =>
      validateMachine({
        machineName: "test",
        initialState: "missing",
        goalState: "b",
        states: { a: {}, b: {} },
      })
    ).toThrow('initialState "missing" does not exist in states');
  });

  test("DIAL_018: rejects machine where goalState not in states", () => {
    expect(() =>
      validateMachine({
        machineName: "test",
        initialState: "a",
        goalState: "missing",
        states: { a: {}, b: {} },
      })
    ).toThrow('goalState "missing" does not exist in states');
  });

  test("DIAL_019: rejects transition pointing to non-existent state", () => {
    expect(() =>
      validateMachine({
        machineName: "test",
        initialState: "a",
        goalState: "b",
        states: {
          a: { transitions: { go: "nowhere" } },
          b: {},
        },
      })
    ).toThrow('transition "go" in state "a" points to non-existent state "nowhere"');
  });

  test("DIAL_020: accepts machine with minimal valid definition", () => {
    expect(() =>
      validateMachine({
        machineName: "test",
        initialState: "a",
        goalState: "b",
        states: {
          a: { transitions: { go: "b" } },
          b: {},
        },
      })
    ).not.toThrow();
  });

  test("DIAL_021: accepts state with no transitions (goal state)", () => {
    expect(() =>
      validateMachine({
        machineName: "test",
        initialState: "a",
        goalState: "b",
        states: {
          a: { transitions: { go: "b" } },
          b: {},
        },
      })
    ).not.toThrow();
  });

  test("DIAL_022: normalizeMachine maps legacy defaultState to goalState", () => {
    const legacy = {
      machineName: "test",
      initialState: "a",
      defaultState: "b",
      states: {
        a: { transitions: { go: "b" } },
        b: {},
      },
    } as unknown as MachineDefinition;

    const normalized = normalizeMachine(legacy);
    expect(normalized.goalState).toBe("b");
  });

  test("DIAL_023: accepts state with custom consensusThreshold", async () => {
    const machine: MachineDefinition = {
      machineName: "threshold-test",
      initialState: "a",
      goalState: "b",
      states: {
        a: {
          prompt: "Go?",
          transitions: { go: "b" },
          consensusThreshold: 0.7,
        },
        b: {},
      },
    };

    const session = await createSession(machine);
    expect(session.machine.states.a.consensusThreshold).toBe(0.7);
  });

  test("DIAL_024: machine-level consensusThreshold stored", async () => {
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

    const session = await createSession(machine);
    expect(session.machine.consensusThreshold).toBe(0.6);
  });

  test("DIAL_025: machine-level specialists array stored", async () => {
    const machine: MachineDefinition = {
      machineName: "specialists-test",
      initialState: "a",
      goalState: "b",
      specialists: [
        {
          role: "proposer",
          specialistId: "p1",
          strategyFnName: "firstAvailable",
        },
      ],
      states: {
        a: { transitions: { go: "b" } },
        b: {},
      },
    };

    const session = await createSession(machine);
    expect(session.machine.specialists).toHaveLength(1);
    expect(session.machine.specialists![0].specialistId).toBe("p1");
  });
});
